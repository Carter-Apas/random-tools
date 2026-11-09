import { element, escape, number } from "./format";

import { evaluateProfile } from "../shared/point-scoring";
import { curveMaximum } from "../shared/curves";
import { variables } from "../shared/variables";
import type { PointProfile, Scenario, VariableId } from "../shared/types";

const mainVariables: VariableId[] = [
  "windSpeed",
  "windDirection",
  "windGust",
  "waveHeight",
  "surfHeight",
  "swellHeight",
  "swellPeriod",
  "swellDirection",
  "rain",
];

export const renderSimulatorInputs = (inputs: Scenario): void => {
  const field = (key: VariableId) => {
    const definition = variables[key];
    return `<label>${escape(definition.label)} <span>${escape(definition.unit)}</span><input class="mono-input" type="number" data-sim="${key}" aria-label="Simulate ${escape(definition.label)}" min="${definition.min}" max="${definition.max}" step="any" value="${inputs[key] ?? ""}" placeholder="Missing" /></label>`;
  };

  element("sim-inputs").innerHTML = mainVariables.map(field).join("");
  element("sim-extra").innerHTML = (Object.keys(variables) as VariableId[])
    .filter((key) => !mainVariables.includes(key))
    .map(field)
    .join("");
};

export const renderSimulation = (profile: PointProfile, inputs: Scenario): void => {
  const score = evaluateProfile(profile, inputs);
  element("sim-score").innerHTML =
    `<div><strong>${number(score.value, 0)}</strong><span>/100</span><b>${escape(score.label)}</b></div><p>${number(score.points)} earned ÷ ${number(score.maxPoints)} maximum × 100</p>`;
  element("sim-breakdown").innerHTML =
    `<h3>Where the points come from</h3>${score.factors.map((factor) => `<button type="button" data-open-curve="${factor.variable}" class="sim-factor ${factor.points !== null && factor.points < 0 ? "is-negative" : ""}"><span>${escape(factor.name)}</span><strong>${number(factor.points)} <small>/ ${number(factor.maxPoints)} pts</small></strong></button>`).join("")}${score.value === null ? `<p class="sim-note">${escape(score.reasons[0])}</p>` : ""}`;
};

export const maximumScenario = (profile: PointProfile, initial: Scenario): Scenario => {
  const next = { ...initial };
  for (const curve of profile.curves.filter((item) => item.enabled))
    next[curve.variable] = curve.points.find((point) => point.y === curveMaximum(curve))!.x;
  return next;
};
