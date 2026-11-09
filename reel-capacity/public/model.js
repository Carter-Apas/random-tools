export const METRES_PER_YARD = 0.9144;

export const PE_SIZES = Object.freeze(
  [
    [0.1, 0.054],
    [0.15, 0.066],
    [0.2, 0.076],
    [0.25, 0.085],
    [0.3, 0.094],
    [0.35, 0.101],
    [0.4, 0.108],
    [0.5, 0.121],
    [0.6, 0.132],
    [0.7, 0.143],
    [0.8, 0.153],
    [1, 0.171],
    [1.2, 0.191],
    [1.5, 0.209],
    [1.7, 0.219],
    [2, 0.242],
    [2.5, 0.27],
    [3, 0.296],
    [4, 0.342],
    [5, 0.382],
    [6, 0.418],
    [8, 0.483],
    [10, 0.54],
    [12, 0.592],
    [15, 0.661],
    [20, 0.764],
    [25, 0.837],
    [30, 0.966],
  ].map(Object.freeze),
);

const positive = (value, name) => {
  if (!Number.isFinite(value) || value <= 0)
    throw new RangeError(`${name} must be greater than zero.`);
  return value;
};

export const convertLength = (value, from, to) => {
  positive(value, "Length");
  if (![from, to].every((unit) => ["m", "yd"].includes(unit)))
    throw new RangeError("Choose metres or yards.");
  return (value * (from === "yd" ? METRES_PER_YARD : 1)) / (to === "yd" ? METRES_PER_YARD : 1);
};

export const peToDiameter = (pe) => {
  positive(pe, "PE size");
  if (pe < PE_SIZES[0][0] || pe > PE_SIZES.at(-1)[0])
    throw new RangeError("Enter a PE size from 0.1 to 30.");
  const upper = PE_SIZES.findIndex(([size]) => size >= pe);
  if (PE_SIZES[upper][0] === pe) return PE_SIZES[upper][1];
  const [lowPe, lowDiameter] = PE_SIZES[upper - 1];
  const [highPe, highDiameter] = PE_SIZES[upper];
  const fraction = (pe - lowPe) / (highPe - lowPe);
  return Math.sqrt(lowDiameter ** 2 + fraction * (highDiameter ** 2 - lowDiameter ** 2));
};

export const diameterToPe = (diameter) => {
  positive(diameter, "Diameter");
  if (diameter < PE_SIZES[0][1] || diameter > PE_SIZES.at(-1)[1]) return null;
  const upper = PE_SIZES.findIndex(([, mm]) => mm >= diameter);
  if (PE_SIZES[upper][1] === diameter) return PE_SIZES[upper][0];
  const [lowPe, lowDiameter] = PE_SIZES[upper - 1];
  const [highPe, highDiameter] = PE_SIZES[upper];
  const fraction = (diameter ** 2 - lowDiameter ** 2) / (highDiameter ** 2 - lowDiameter ** 2);
  return lowPe + fraction * (highPe - lowPe);
};

export const toDiameter = (value, unit) => {
  positive(value, unit === "pe" ? "PE size" : "Diameter");
  if (unit === "pe") return peToDiameter(value);
  if (unit !== "mm") throw new RangeError("Choose mm or PE.");
  if (value < 0.01 || value > 5) throw new RangeError("Enter a diameter from 0.01 to 5 mm.");
  return value;
};

export const estimateCapacity = (lengthMetres, knownDiameter, targetDiameter) => {
  positive(lengthMetres, "Known length");
  positive(knownDiameter, "Known diameter");
  positive(targetDiameter, "Target diameter");
  const result = lengthMetres * (knownDiameter / targetDiameter) ** 2;
  if (!Number.isFinite(result)) throw new RangeError("These values are too large to calculate.");
  return result;
};
