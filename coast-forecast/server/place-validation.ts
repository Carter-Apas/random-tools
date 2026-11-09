import { mergeOverride } from "./spots.js";

import { asRecord, boundedNumber } from "../shared/config-validation.js";
import { newPlace } from "../shared/places.js";
import type { Spot } from "../shared/types.js";

const textLimits: Record<string, number> = { name: 100, coast: 80, note: 600 };
export const placeFields = [
  "name",
  "coast",
  "note",
  "latitude",
  "longitude",
  "marineLatitude",
  "marineLongitude",
  "surfHeightFactor",
  "offshoreFromDegrees",
  "calibrated",
  "scoring",
];

export const patchPlace = (spot: Spot, input: unknown): Spot => {
  const patch = asRecord(input, "Place settings");
  const numeric: Record<string, unknown> = {};
  const result = { ...spot };
  for (const [key, value] of Object.entries(patch)) {
    if (!placeFields.includes(key)) throw new Error(`Unsupported setting: ${key}`);
    if (Object.hasOwn(textLimits, key)) {
      if (typeof value !== "string" || !value.trim() || value.length > textLimits[key])
        throw new Error(`${key} must be text between 1 and ${textLimits[key]} characters.`);
      Object.assign(result, { [key]: value.trim() });
    } else numeric[key] = value;
  }
  return mergeOverride(result, numeric);
};

export const parsePlace = (id: string, input: unknown): Spot => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 64)
    throw new Error(
      "Place IDs must contain lowercase letters, numbers and single hyphens (up to 64 characters).",
    );
  const value = asRecord(input, `Place ${id}`);
  for (const key of placeFields)
    if (!Object.hasOwn(value, key)) throw new Error(`Place ${id} is missing ${key}.`);
  const latitude = boundedNumber(value.latitude, -90, 90, "latitude");
  const longitude = boundedNumber(value.longitude, -180, 180, "longitude");
  return patchPlace(newPlace(id, id, latitude, longitude), value);
};
