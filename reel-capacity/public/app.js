import { initMono } from "/mono.js";
import { PE_SIZES, convertLength, diameterToPe, toDiameter, estimateCapacity } from "./model.js";

const $ = (id) => document.getElementById(id);

const storageKey = "reel-capacity:v1";
const defaults = {
  length: "200",
  lengthUnit: "m",
  size: "0.20",
  sizeUnit: "mm",
  target: "0.16",
  targetUnit: "mm",
  view: "pe",
};
const fields = {
  length: $("known-length"),
  lengthUnit: $("length-unit"),
  size: $("known-size"),
  sizeUnit: $("size-unit"),
  target: $("target-size"),
  targetUnit: $("target-unit"),
};
let view = "pe";
let rows = [];
let known = null;
const integer = new Intl.NumberFormat("en-NZ", { maximumFractionDigits: 0 });

const decimal = (value, digits = 3) =>
  new Intl.NumberFormat("en-NZ", { maximumFractionDigits: digits }).format(value);

const lengthLabel = (value) => (value < 0.5 ? "<1" : integer.format(value));

const editable = (value) => String(Number(value.toFixed(8)));

const restore = () => {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(storageKey));
  } catch (error) {
    saved = {};
    console.warn("Saved reel inputs could not be loaded; using defaults:", error);
  }
  if (!saved || typeof saved !== "object") saved = {};
  for (const [key, field] of Object.entries(fields)) {
    const value = saved[key];
    const isUnit = key.endsWith("Unit");
    const valid =
      typeof value === "string" &&
      (isUnit
        ? [...field.options].some((option) => option.value === value)
        : value !== "" && Number.isFinite(Number(value)) && Number(value) > 0);
    field.value = valid ? value : defaults[key];
  }
  view = saved.view === "mm" ? "mm" : "pe";
};

const save = () => {
  const data = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));
  try {
    localStorage.setItem(storageKey, JSON.stringify({ ...data, view }));
    $("storage-notice").hidden = true;
  } catch (error) {
    $("storage-notice").hidden = false;
    console.warn("Reel inputs could not be saved:", error);
  }
};

const describeDiameter = (diameter) => {
  const pe = diameterToPe(diameter);
  return pe === null
    ? "Outside the PE reference range; using your diameter."
    : `≈ PE ${decimal(pe)} using the reference chart`;
};

const setSizeBounds = (input, unit, label, prefix) => {
  input.min = unit === "pe" ? "0.1" : "0.01";
  input.max = unit === "pe" ? "30" : "5";
  label.textContent = unit === "pe" ? `${prefix} PE size` : `${prefix} diameter`;
};

const render = () => {
  known = null;
  rows = [];
  $("input-error").textContent = "";
  $("target-error").textContent = "";
  $("length-conversion").textContent = "";
  $("size-conversion").textContent = "";
  $("target-conversion").textContent = "";
  $("capacity-change").textContent = "";
  $("result-metres").textContent = "—";
  $("result-yards").textContent = "— yards";
  Object.values(fields).forEach((field) => field.removeAttribute("aria-invalid"));
  setSizeBounds(fields.size, fields.sizeUnit.value, $("known-size-label"), "Known line");
  setSizeBounds(fields.target, fields.targetUnit.value, $("target-size-label"), "Target");
  let knownDiameter;
  let lengthMetres;
  try {
    const length = Number(fields.length.value);
    if (!fields.length.validity.valid || length <= 0) {
      fields.length.setAttribute("aria-invalid", "true");
      throw new RangeError("Enter a known length greater than 0, up to 1,000,000.");
    }
    lengthMetres = convertLength(length, fields.lengthUnit.value, "m");
    const otherUnit = fields.lengthUnit.value === "m" ? "yd" : "m";
    $("length-conversion").textContent =
      `= ${decimal(convertLength(length, fields.lengthUnit.value, otherUnit), 2)} ${otherUnit === "m" ? "metres" : "yards"}`;
    try {
      knownDiameter = toDiameter(Number(fields.size.value), fields.sizeUnit.value);
    } catch (error) {
      fields.size.setAttribute("aria-invalid", "true");
      throw error;
    }
    $("size-conversion").textContent =
      fields.sizeUnit.value === "pe"
        ? `≈ ${decimal(knownDiameter, 4)} mm (reference diameter)`
        : describeDiameter(knownDiameter);
    known = { diameter: knownDiameter, metres: lengthMetres };
  } catch (error) {
    $("input-error").textContent = error.message;
  }

  let targetDiameter;
  try {
    targetDiameter = toDiameter(Number(fields.target.value), fields.targetUnit.value);
    $("target-conversion").textContent =
      fields.targetUnit.value === "pe"
        ? `≈ ${decimal(targetDiameter, 4)} mm (reference diameter)`
        : describeDiameter(targetDiameter);
    if (known) {
      const capacity = estimateCapacity(lengthMetres, knownDiameter, targetDiameter);
      $("result-metres").textContent = lengthLabel(capacity);
      $("result-yards").textContent = `${lengthLabel(convertLength(capacity, "m", "yd"))} yards`;
      const ratio = capacity / lengthMetres;
      const change = Math.abs((ratio - 1) * 100);
      $("capacity-change").textContent =
        change < 0.05
          ? "Same capacity as your known line"
          : `${decimal(change, 1)}% ${ratio > 1 ? "more" : "less"} line than your known size`;
    }
  } catch (error) {
    fields.target.setAttribute("aria-invalid", "true");
    $("target-error").textContent = error.message;
  }

  $("show-pe").setAttribute("aria-pressed", String(view === "pe"));
  $("show-mm").setAttribute("aria-pressed", String(view === "mm"));
  $("size-column").textContent = view === "pe" ? "PE size" : "Diameter";
  $("equivalent-column").textContent = view === "pe" ? "Approx. diameter" : "Approx. PE";
  $("capacity-rows").replaceChildren();
  $("export").disabled = !known;
  $("row-count").textContent = "";
  $("table-summary").textContent = known
    ? `Based on ${decimal(Number(fields.length.value), 2)} ${fields.lengthUnit.value} at ${fields.sizeUnit.value === "pe" ? `PE ${decimal(Number(fields.size.value))}` : `${decimal(knownDiameter)} mm`}.`
    : "Enter a valid known capacity to see estimates.";

  if (!known) {
    const row = $("capacity-rows").insertRow();
    const cell = row.insertCell();
    cell.colSpan = 5;
    cell.textContent = "Your capacity comparison will appear here.";
    save();
    return;
  }

  const sizes =
    view === "pe"
      ? PE_SIZES.map(([pe, diameter]) => ({ size: pe, diameter }))
      : Array.from({ length: 55 }, (_, i) => ({
          size: (i + 6) / 100,
          diameter: (i + 6) / 100,
        }));
  rows = sizes.map((item) => {
    const metres = estimateCapacity(lengthMetres, knownDiameter, item.diameter);
    return { ...item, metres, yards: convertLength(metres, "m", "yd") };
  });
  const longest = rows[0].metres;
  for (const item of rows) {
    const row = document.createElement("tr");
    const selected =
      targetDiameter !== undefined && Math.abs(item.diameter - targetDiameter) < 1e-8;
    row.classList.toggle("selected", selected);
    const sizeCell = row.insertCell();
    const button = document.createElement("button");
    button.type = "button";
    button.className = "size-button";
    button.textContent = view === "pe" ? `PE ${decimal(item.size)}` : `${decimal(item.size, 2)} mm`;
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-label", `Use ${button.textContent} as target size`);
    button.addEventListener("click", () => {
      fields.targetUnit.value = view === "pe" ? "pe" : "mm";
      previousTargetUnit = fields.targetUnit.value;
      fields.target.value = String(item.size);
      render();
      fields.target.focus({ preventScroll: true });
    });
    sizeCell.append(button);
    const equivalent =
      view === "pe"
        ? `${item.diameter.toFixed(3)} mm`
        : `PE ${decimal(diameterToPe(item.diameter), 2)}`;
    row.insertCell().textContent = equivalent;
    const metresCell = row.insertCell();
    metresCell.className = "numeric metres";
    metresCell.textContent = lengthLabel(item.metres);
    const yardsCell = row.insertCell();
    yardsCell.className = "numeric";
    yardsCell.textContent = lengthLabel(item.yards);
    const bar = document.createElement("div");
    bar.className = "row-bar";
    bar.setAttribute("aria-hidden", "true");
    const fill = document.createElement("span");
    fill.style.width = `${(item.metres / longest) * 100}%`;
    bar.append(fill);
    row.insertCell().append(bar);
    $("capacity-rows").append(row);
  }
  $("row-count").textContent =
    view === "pe" ? `${rows.length} PE sizes · 0.1–30` : `${rows.length} diameters · 0.06–0.60 mm`;
  save();
};

const switchSizeUnit = (input, oldUnit, newUnit) => {
  try {
    const diameter = toDiameter(Number(input.value), oldUnit);
    const converted = newUnit === "pe" ? diameterToPe(diameter) : diameter;

    input.value = converted === null ? "" : editable(converted);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    input.value = "";
  }
};

restore();
let previousLengthUnit = fields.lengthUnit.value;
let previousSizeUnit = fields.sizeUnit.value;
let previousTargetUnit = fields.targetUnit.value;

fields.lengthUnit.addEventListener("change", () => {
  try {
    fields.length.value = editable(
      convertLength(Number(fields.length.value), previousLengthUnit, fields.lengthUnit.value),
    );
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    fields.length.value = "";
  }
  previousLengthUnit = fields.lengthUnit.value;
  render();
});
fields.sizeUnit.addEventListener("change", () => {
  switchSizeUnit(fields.size, previousSizeUnit, fields.sizeUnit.value);
  previousSizeUnit = fields.sizeUnit.value;
  render();
});
fields.targetUnit.addEventListener("change", () => {
  switchSizeUnit(fields.target, previousTargetUnit, fields.targetUnit.value);
  previousTargetUnit = fields.targetUnit.value;
  render();
});
[fields.length, fields.size, fields.target].forEach((input) =>
  input.addEventListener("input", render),
);
$("capacity-form").addEventListener("submit", (event) => event.preventDefault());
for (const unit of ["pe", "mm"])
  $("show-" + unit).addEventListener("click", () => {
    view = unit;
    render();
  });
$("reset").addEventListener("click", () => {
  for (const [key, field] of Object.entries(fields)) field.value = defaults[key];
  previousLengthUnit = "m";
  previousSizeUnit = previousTargetUnit = "mm";
  view = "pe";
  render();
});
$("export").addEventListener("click", () => {
  if (!known || rows.length === 0) return;
  const header = [
    "PE size (approximate reference)",
    "Diameter mm",
    "Estimated metres",
    "Estimated yards",
    "Known metres",
    "Known diameter mm",
  ];
  const lines = rows.map((row) => [
    view === "pe" ? row.size : diameterToPe(row.diameter).toFixed(6),
    row.diameter,
    row.metres.toFixed(4),
    row.yards.toFixed(4),
    known.metres,
    known.diameter,
  ]);
  const csv = [header, ...lines].map((line) => line.join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `reel-capacity-${view}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

for (let y = 119; y <= 214; y += 5) {
  const ellipse = document.createElementNS("http://www.w3.org/2000/svg", "path");
  ellipse.setAttribute("d", `M53 ${y}c0 23 43 42 97 42s97-19 97-42`);
  ellipse.setAttribute("opacity", String(0.35 + (y % 4) * 0.1));
  $("spool-lines").append(ellipse);
}
render();

initMono();
