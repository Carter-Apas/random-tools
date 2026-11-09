import { readFile } from "node:fs/promises";

import { boundedNumber, mergeScoring } from "./validation.js";

import { defaultScoring } from "../shared/scoring-config.js";
import type { Spot } from "../shared/types.js";

const defaults: Spot[] = [
  {
    id: "piha",
    name: "Piha / Māori Bay",
    coast: "West coast",
    latitude: -36.954,
    longitude: 174.468,
    marineLatitude: -36.95,
    marineLongitude: 174.4,
    offshoreFromDegrees: 90,
    surfHeightFactor: 1,
    calibrated: false,
    scoring: defaultScoring(90, 240),
    note: "A regional outlook sampled off Piha. Māori Bay can differ with shelter, sandbanks and swell direction.",
  },
  {
    id: "te-arai",
    name: "Te Ārai",
    coast: "East coast",
    latitude: -36.142,
    longitude: 174.649,
    marineLatitude: -36.14,
    marineLongitude: 174.7,
    offshoreFromDegrees: 250,
    surfHeightFactor: 1,
    calibrated: false,
    scoring: defaultScoring(250, 45),
    note: "An open-coast outlook off Te Ārai. Headlands and local sandbanks can change the waves at the beach.",
  },
];

export const tuneSpot = (spot: Spot, params: URLSearchParams): Spot => {
  const factor = params.get("surf_factor");
  const offshore = params.get("offshore_from");
  return {
    ...spot,
    surfHeightFactor:
      factor === null ? spot.surfHeightFactor : boundedNumber(factor, 0.1, 3, "surf_factor"),
    offshoreFromDegrees:
      offshore === null
        ? spot.offshoreFromDegrees
        : boundedNumber(offshore, 0, 359, "offshore_from"),
    calibrated: factor === null ? spot.calibrated : false,
  };
};

export const loadSpots = async (path = process.env.SPOT_CONFIG_FILE) => {
  if (!path) return structuredClone(defaults);
  const overrides = JSON.parse(await readFile(path, "utf8")) as Record<
    string,
    Record<string, unknown>
  >;
  if (!overrides || Array.isArray(overrides) || typeof overrides !== "object")
    throw new Error("Spot configuration must be an object keyed by spot ID.");
  for (const id of Object.keys(overrides)) {
    if (!defaults.some((spot) => spot.id === id)) throw new Error(`Unknown spot: ${id}`);
  }
  return defaults.map((spot) => mergeOverride(spot, overrides[spot.id]));
};

export const mergeOverride = (spot: Spot, override: Record<string, unknown> = {}): Spot => {
  const ranges: Record<string, [number, number]> = {
    latitude: [-90, 90],
    longitude: [-180, 180],
    marineLatitude: [-90, 90],
    marineLongitude: [-180, 180],
    offshoreFromDegrees: [0, 359],
    surfHeightFactor: [0.1, 3],
  };
  const result = { ...spot };
  for (const [key, value] of Object.entries(override)) {
    if (key === "calibrated" && typeof value === "boolean") result[key] = value;
    else if (key === "scoring") result.scoring = mergeScoring(spot.scoring, value);
    else if (Object.hasOwn(ranges, key))
      Object.assign(result, { [key]: boundedNumber(value, ...ranges[key], key) });
    else throw new Error(`Unsupported spot setting: ${key}`);
  }
  return result;
};
