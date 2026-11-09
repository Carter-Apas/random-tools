import { mergeOverride } from "./spots.js";

import { directionCurve } from "../shared/scoring-config.js";
import { asRecord, boundedNumber } from "../shared/config-validation.js";
import type { ConfigurationDocument, Spot, SpotConfiguration } from "../shared/types.js";

const editable = ["surfHeightFactor", "offshoreFromDegrees", "calibrated", "scoring"];

export const patchSpot = (spot: Spot, input: unknown): Spot => {
  const patch = asRecord(input, "Spot settings");
  for (const field of Object.keys(patch))
    if (!editable.includes(field)) throw new Error(`Unsupported setting: ${field}`);
  return mergeOverride(spot, patch);
};

export const exportConfiguration = (spots: Spot[]): ConfigurationDocument => ({
  schemaVersion: 2,
  spots: Object.fromEntries(
    spots.map((spot) => [
      spot.id,
      Object.fromEntries(
        editable.map((key) => [key, spot[key as keyof Spot]]),
      ) as unknown as SpotConfiguration,
    ]),
  ),
});

export const importConfiguration = (input: unknown, defaults: Spot[]): Spot[] => {
  const document = asRecord(input, "Configuration");
  const legacy = !Object.hasOwn(document, "schemaVersion");
  if (!legacy && document.schemaVersion !== 2)
    throw new Error("Unsupported configuration version. Expected schemaVersion 2.");
  if (!legacy && Object.keys(document).some((key) => !["schemaVersion", "spots"].includes(key)))
    throw new Error("Unknown configuration property.");
  const saved = asRecord(legacy ? document : document.spots, "Configuration spots");
  for (const id of Object.keys(saved))
    if (!defaults.some((spot) => spot.id === id)) throw new Error(`Unknown spot: ${id}`);
  if (!legacy && defaults.some((spot) => !Object.hasOwn(saved, spot.id)))
    throw new Error("The configuration must include both coasts.");
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
