import { initMono } from "@random-tools/mono/browser";
import "@random-tools/mono/styles.css";
import "./styles.css";
import "./admin.css";

import { curveSvg, graphView } from "./curve-graph";
import { openCurveEditor } from "./curve-editor";
import { element, escape, number } from "./format";
import { maximumScenario, renderSimulation, renderSimulatorInputs } from "./lab-simulator";

import { parseProfile, boundedNumber } from "../shared/config-validation";
import { curveMaximum } from "../shared/curves";
import { evaluateProfile } from "../shared/point-scoring";
import { makeCurve } from "../shared/scoring-config";
import { activityNames, initialScenario, profileActivities, variables } from "../shared/variables";
import type {
  AdminSettings,
  ConfigurationDocument,
  Forecast,
  PointCurve,
  ProfileActivity,
  Spot,
  VariableId,
} from "../shared/types";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

let settings: AdminSettings;
let drafts: Spot[] = [];
let place = new URLSearchParams(location.search).get("spot") === "te-arai" ? "te-arai" : "piha";
let activity: ProfileActivity = "surfing";
let scenario = initialScenario();
let dirty = false;
let configured = true;
let imported: unknown;

initMono();

const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, options);
  const result = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok)
    throw new ApiError(
      result.error?.message ?? "The request could not be completed.",
      response.status,
    );
  return result;
};

const showError = (error: unknown) => {
  element("lab-error").hidden = false;
  element("lab-error").textContent =
    error instanceof Error ? error.message : "Unable to complete the request.";
  if (error instanceof ApiError && error.status === 401) void checkSession();
};

const spot = () => drafts.find((item) => item.id === place)!;

const profile = () => spot().scoring[activity];

const markDirty = () => {
  dirty = true;
  element("save-state").textContent = "Unsaved changes";
};

const currentCurve = (variable: VariableId): PointCurve =>
  profile().curves.find((curve) => curve.variable === variable) ??
  makeCurve(
    variable,
    [
      [variables[variable].min, 0],
      [variables[variable].max, 0],
    ],
    false,
  );

const replaceCurve = (curve: PointCurve) => {
  profile().curves = [
    ...profile().curves.filter((item) => item.variable !== curve.variable),
    curve,
  ];
};

const renderVariables = () => {
  const score = evaluateProfile(profile(), scenario);
  element("maximum-total").textContent = `${number(score.maxPoints)} pts available`;
  element("variable-list").innerHTML = (Object.keys(variables) as VariableId[])
    .map((key) => {
      const curve = currentCurve(key);
      const definition = variables[key];
      const factor = score.factors.find((item) => item.variable === key);
      return `<article class="variable-card${curve.enabled ? "" : " is-disabled"}"><label class="variable-toggle"><input type="checkbox" data-enable="${key}" aria-label="Include ${escape(definition.label)}" ${curve.enabled ? "checked" : ""}/></label><button type="button" class="variable-open" data-open-curve="${key}"><span class="variable-copy"><strong>${escape(definition.label)}</strong><small>${curve.enabled ? `${number(factor?.points)} earned / ${number(curveMaximum(curve))} maximum pts` : "Disabled · click to explore"}</small></span>${curveSvg(curve, graphView(curve, true), { mini: true })}<span class="variable-chevron" aria-hidden="true">↗</span></button></article>`;
    })
    .join("");
};

const render = () => {
  document
    .querySelectorAll<HTMLButtonElement>("[data-spot]")
    .forEach((button) =>
      button.setAttribute("aria-pressed", String(button.dataset.spot === place)),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-activity]")
    .forEach((button) =>
      button.setAttribute("aria-pressed", String(button.dataset.activity === activity)),
    );
  element<HTMLInputElement>("surf-factor").value = String(spot().surfHeightFactor);
  element<HTMLInputElement>("offshore-from").value = String(spot().offshoreFromDegrees);
  element<HTMLInputElement>("calibrated").checked = spot().calibrated;
  renderVariables();
  renderSimulatorInputs(scenario);
  renderSimulation(profile(), scenario);
};

const editCurve = (key: VariableId) => {
  openCurveEditor({
    curve: currentCurve(key),
    context: `${spot().name} / ${activityNames[activity]}`,
    input: scenario[key],
    preview: (curve) =>
      evaluateProfile(
        { curves: [...profile().curves.filter((item) => item.variable !== key), curve] },
        scenario,
      ),
    apply: (curve) => {
      replaceCurve(curve);
      markDirty();
      renderVariables();
      renderSimulation(profile(), scenario);
    },
  });
};

const documentValue = (): ConfigurationDocument => ({
  schemaVersion: 2,
  spots: Object.fromEntries(
    drafts.map((item) => [
      item.id,
      {
        surfHeightFactor: item.surfHeightFactor,
        offshoreFromDegrees: item.offshoreFromDegrees,
        calibrated: item.calibrated,
        scoring: item.scoring,
      },
    ]),
  ),
});

const validateDrafts = () => {
  for (const item of drafts) for (const key of profileActivities) parseProfile(item.scoring[key]);
};

const load = async () => {
  settings = await request<AdminSettings>("/api/admin/settings");
  if (!dirty) drafts = structuredClone(settings.spots);
  element("login-panel").hidden = true;
  element("lab").hidden = false;
  element("logout").hidden = false;
  element("lab-status").textContent = "";
  render();
};

const checkSession = async () => {
  try {
    const session = await request<{ configured: boolean; authenticated: boolean }>(
      "/api/admin/session",
    );
    configured = session.configured;
    if (session.authenticated) {
      await load();
      return;
    }
    element("lab").hidden = true;
    element("logout").hidden = true;
    element("login-panel").hidden = false;
    element("login-title").textContent = configured
      ? "Sign in to the lab."
      : "Give your lab a password.";
    element("login-description").textContent = configured
      ? "Use your admin password to edit the scoring curves."
      : "Choose a password to protect your configuration. It will be saved on this server.";
    element("login-button").textContent = configured ? "Sign in" : "Set password & open lab";
    element("confirm-password-field").hidden = configured;
    element<HTMLInputElement>("confirm-password").required = !configured;
    element<HTMLInputElement>("admin-password").autocomplete = configured
      ? "current-password"
      : "new-password";
    element("lab-status").textContent = "";
  } catch (error) {
    showError(error);
  }
};

const save = async () => {
  try {
    validateDrafts();
    element("lab").inert = true;
    element("lab-error").hidden = true;
    element("lab-status").textContent = "Saving configuration…";
    settings = await request<AdminSettings>("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(documentValue()),
    });
    drafts = structuredClone(settings.spots);
    dirty = false;
    element("save-state").textContent = "All changes saved";
    element("lab-status").textContent = "Configuration saved. Forecasts now use these curves.";
    render();
  } catch (error) {
    showError(error);
    element("lab-status").textContent = "Configuration was not saved.";
  } finally {
    element("lab").inert = false;
  }
};

const loadTomorrow = async () => {
  element("sim-status").textContent = "Loading the cached forecast…";
  try {
    const forecast = await request<Forecast>(`/api/v1/forecast?spot=${place}`);
    const hour =
      forecast.hours.find((item) => item.localTime.endsWith("T06:00")) ?? forecast.hours[0];
    scenario = {
      surfHeight: hour.estimatedSurfHeightM,
      waveHeight: hour.waves.heightM,
      swellHeight: hour.primarySwell.heightM,
      swellPeriod: hour.primarySwell.periodS,
      swellDirection: hour.primarySwell.directionDeg,
      windSpeed: hour.wind.speedKmh,
      windGust: hour.wind.gustKmh,
      windDirection: hour.wind.fromDeg,
      rain: hour.precipitationMm,
      rainProbability: hour.precipitationProbabilityPct,
      waterTemperature: hour.waterTemperatureC,
      airTemperature: hour.airTemperatureC,
      weatherCode: hour.weatherCode,
      secondarySwellHeight: hour.secondarySwell.heightM,
      secondarySwellDirection: hour.secondarySwell.directionDeg,
    };
    render();
    element("sim-status").textContent =
      `Loaded ${forecast.date} at ${hour.localTime.slice(11)}. Editing these values does not change the forecast.`;
  } catch (error) {
    element("sim-status").textContent =
      error instanceof Error ? error.message : "Forecast unavailable.";
  }
};

const preset = (name: string) => {
  if (name === "best") {
    scenario = maximumScenario(profile(), scenario);
    element("sim-status").textContent =
      "Every enabled curve is at its own maximum. This is the mathematical 100-point reference.";
  }
  if (name === "onshore") {
    scenario = {
      ...maximumScenario(profile(), scenario),
      windDirection: (spot().offshoreFromDegrees + 180) % 360,
      windSpeed: 20,
      windGust: 30,
    };
    element("sim-status").textContent = "Onshore wind against otherwise favourable inputs.";
  }
  if (name === "calm") {
    scenario = {
      ...initialScenario(),
      surfHeight: 0.2,
      waveHeight: 0.2,
      swellHeight: 0.15,
      swellPeriod: 7,
      windSpeed: 3,
      windGust: 5,
      windDirection: spot().offshoreFromDegrees,
      rain: 0,
      weatherCode: 0,
    };
    element("sim-status").textContent = "Small waves, light wind and no rain.";
  }
  render();
};

const download = () => {
  try {
    validateDrafts();
    const blob = new Blob([`${JSON.stringify(documentValue(), null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "coast-forecast-curves.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    element("lab-status").textContent = dirty
      ? "Exported current curves, including unsaved edits."
      : "Configuration exported.";
  } catch (error) {
    showError(error);
  }
};

const chooseImport = async () => {
  const file = element<HTMLInputElement>("import-file").files?.[0];
  if (!file) return;
  try {
    if (file.size > 2 * 1024 * 1024)
      throw new Error("Choose a JSON configuration smaller than 2 MB.");
    imported = JSON.parse(await file.text()) as unknown;
    if (!imported || typeof imported !== "object" || Array.isArray(imported))
      throw new Error("Choose a JSON configuration object.");
    const document = imported as Record<string, unknown>;
    element("import-summary").textContent =
      `${file.name} · ${number(file.size / 1024)} KB · ${document.schemaVersion === 2 ? "Version 2 points curves" : "Legacy configuration; it will be migrated to curves"}`;
    element("import-error").textContent = "";
    element<HTMLDialogElement>("import-dialog").showModal();
  } catch (error) {
    showError(error);
  } finally {
    element<HTMLInputElement>("import-file").value = "";
  }
};

const applyImport = async () => {
  element<HTMLButtonElement>("apply-import").disabled = true;
  try {
    settings = await request<AdminSettings>("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(imported),
    });
    drafts = structuredClone(settings.spots);
    dirty = false;
    element("save-state").textContent = "All changes saved";
    element("lab-status").textContent = "Configuration imported and saved.";
    element<HTMLDialogElement>("import-dialog").close();
    render();
  } catch (error) {
    element("import-error").textContent =
      error instanceof Error ? error.message : "Import failed; nothing was changed.";
  } finally {
    element<HTMLButtonElement>("apply-import").disabled = false;
  }
};

const changeCalibration = () => {
  try {
    spot().surfHeightFactor = boundedNumber(
      element<HTMLInputElement>("surf-factor").value,
      0.1,
      3,
      "Surf multiplier",
    );
    spot().offshoreFromDegrees = boundedNumber(
      element<HTMLInputElement>("offshore-from").value,
      0,
      359,
      "Offshore bearing",
    );
    spot().calibrated = element<HTMLInputElement>("calibrated").checked;
    markDirty();
  } catch (error) {
    showError(error);
  }
};

const openFromEvent = (event: MouseEvent) => {
  const target =
    event.target instanceof Element ? event.target.closest<HTMLElement>("[data-open-curve]") : null;
  if (target?.dataset.openCurve) editCurve(target.dataset.openCurve as VariableId);
};

for (const id of ["variable-list", "sim-breakdown"])
  element(id).addEventListener("click", openFromEvent);
element("variable-list").addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  if (!input.dataset.enable) return;
  const curve = structuredClone(currentCurve(input.dataset.enable as VariableId));
  curve.enabled = input.checked;
  replaceCurve(curve);
  markDirty();
  renderVariables();
  renderSimulation(profile(), scenario);
});
for (const id of ["sim-inputs", "sim-extra"])
  element(id).addEventListener("input", (event) => {
    const input = event.target as HTMLInputElement;
    if (!input.dataset.sim) return;
    scenario[input.dataset.sim as VariableId] =
      input.value === "" || !Number.isFinite(input.valueAsNumber) ? null : input.valueAsNumber;
    renderVariables();
    renderSimulation(profile(), scenario);
  });
document.querySelectorAll<HTMLButtonElement>("[data-spot]").forEach((button) =>
  button.addEventListener("click", () => {
    place = button.dataset.spot ?? "piha";
    history.replaceState(null, "", `/admin?spot=${place}`);
    render();
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-activity]").forEach((button) =>
  button.addEventListener("click", () => {
    activity = button.dataset.activity as ProfileActivity;
    render();
  }),
);
document
  .querySelectorAll<HTMLButtonElement>("[data-preset]")
  .forEach((button) =>
    button.addEventListener("click", () => preset(button.dataset.preset ?? "best")),
  );
for (const id of ["surf-factor", "offshore-from", "calibrated"])
  element(id).addEventListener("change", changeCalibration);
element("save-config").addEventListener("click", () => {
  void save();
});
element("export-config").addEventListener("click", download);
element("choose-import").addEventListener("click", () =>
  element<HTMLInputElement>("import-file").click(),
);
element("import-file").addEventListener("change", () => {
  void chooseImport();
});
element("apply-import").addEventListener("click", () => {
  void applyImport();
});
element("cancel-import").addEventListener("click", () =>
  element<HTMLDialogElement>("import-dialog").close(),
);
element("load-forecast").addEventListener("click", () => {
  void loadTomorrow();
});
element("reset-profile").addEventListener("click", () => {
  spot().scoring[activity] = structuredClone(
    settings.defaults.find((item) => item.id === place)!.scoring[activity],
  );
  markDirty();
  render();
});
element("logout").addEventListener("click", () => {
  void request("/api/admin/logout", { method: "POST" })
    .then(() => {
      dirty = false;
      drafts = [];
      return checkSession();
    })
    .catch(showError);
});
element("login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const password = element<HTMLInputElement>("admin-password").value;
  if (!configured && password !== element<HTMLInputElement>("confirm-password").value) {
    element("login-error").textContent = "The passwords do not match.";
    return;
  }
  element<HTMLButtonElement>("login-button").disabled = true;
  element("login-error").textContent = "";
  void request(`/api/admin/${configured ? "login" : "setup"}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  })
    .then(async () => {
      element<HTMLInputElement>("admin-password").value = "";
      element<HTMLInputElement>("confirm-password").value = "";
      await load();
    })
    .catch((error: unknown) => {
      element("login-error").textContent =
        error instanceof Error ? error.message : "Sign-in failed.";
    })
    .finally(() => {
      element<HTMLButtonElement>("login-button").disabled = false;
    });
});
window.addEventListener("beforeunload", (event) => {
  if (dirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});
void checkSession();
