import { defaultScoring } from "./scoring-config.js";
import { destination, wrapBearing } from "./orientation.js";
import type { Spot, ConfigurationDocument } from "./types.js";

export const newPlace = (
  id: string,
  name: string,
  latitude: number,
  longitude: number,
  offshoreFromDegrees = 90,
): Spot => {
  const sea = destination({ latitude, longitude }, wrapBearing(offshoreFromDegrees + 180), 2000);
  return {
    id,
    name,
    coast: "Custom coast",
    latitude,
    longitude,
    marineLatitude: sea.latitude,
    marineLongitude: sea.longitude,
    offshoreFromDegrees,
    surfHeightFactor: 1,
    calibrated: false,
    note: "A regional coastal forecast. Tune the sampling point and scoring curves for this place.",
    scoring: defaultScoring(offshoreFromDegrees, wrapBearing(offshoreFromDegrees + 180)),
  };
};

export const defaultPlace = (spot: Spot): Spot => ({
  ...structuredClone(spot),
  scoring: defaultScoring(spot.offshoreFromDegrees, wrapBearing(spot.offshoreFromDegrees + 180)),
  surfHeightFactor: 1,
  calibrated: false,
});

export const configurationDocument = (spots: Spot[]): ConfigurationDocument => ({
  schemaVersion: 3,
  spots: Object.fromEntries(spots.map(({ id, ...configuration }) => [id, configuration])),
});

export const placeId = (name: string, existing: string[]): string => {
  const stem =
    name
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "place";
  let id = stem;
  let suffix = 2;
  while (existing.includes(id)) id = `${stem}-${suffix++}`;
  return id;
};
