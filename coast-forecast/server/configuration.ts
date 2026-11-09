import { parsePlace, patchPlace } from "./place-validation.js";

import { configurationDocument } from "../shared/places.js";
import { directionCurve } from "../shared/scoring-config.js";
import { asRecord, boundedNumber } from "../shared/config-validation.js";
import type { Spot } from "../shared/types.js";

export const patchSpot = patchPlace;
export const exportConfiguration = configurationDocument;

const importPlaces = (input: unknown): Spot[] => {
  const saved = asRecord(input, "Configuration spots");
  const entries = Object.entries(saved);
  if (entries.length < 1 || entries.length > 32)
    throw new Error("Include between 1 and 32 places.");
  return entries.map(([id, configuration]) => parsePlace(id, configuration));
};

export const importConfiguration = (input: unknown, defaults: Spot[]): Spot[] => {
  const document = asRecord(input, "Configuration");
  if (document.schemaVersion === 3) {
    if (Object.keys(document).some((key) => !["schemaVersion", "spots"].includes(key)))
      throw new Error("Unknown configuration property.");
    return importPlaces(document.spots);
  }
  return importLegacy(document, defaults);
};

const importLegacy = (document: Record<string, unknown>, defaults: Spot[]): Spot[] => {
  const legacy = !Object.hasOwn(document, "schemaVersion");
  if (!legacy && document.schemaVersion !== 2)
    throw new Error(
      "Unsupported configuration version. Expected schemaVersion 3 (version 2 is also supported).",
    );
  if (!legacy && Object.keys(document).some((key) => !["schemaVersion", "spots"].includes(key)))
    throw new Error("Unknown configuration property.");
  const saved = asRecord(legacy ? document : document.spots, "Configuration spots");
  for (const id of Object.keys(saved))
    if (!defaults.some((spot) => spot.id === id)) throw new Error(`Unknown spot: ${id}`);
  if (!legacy && defaults.some((spot) => !Object.hasOwn(saved, spot.id)))
    throw new Error("Version 2 configuration must include the original places.");
  return defaults.map((spot) => {
    if (!Object.hasOwn(saved, spot.id)) return structuredClone(spot);
    const patch = asRecord(saved[spot.id], "Spot settings");
    const base = structuredClone(spot);
    if (legacy && Object.hasOwn(patch, "offshoreFromDegrees")) {
      const bearing = boundedNumber(patch.offshoreFromDegrees, 0, 359, "offshoreFromDegrees");
      base.scoring.surfing.curves = base.scoring.surfing.curves.map((curve) =>
        curve.variable === "windDirection"
          ? directionCurve("windDirection", bearing, 20, -200)
          : curve,
      );
    }
    return patchSpot(base, patch);
  });
};
