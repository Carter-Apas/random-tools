import type { ProviderRow } from "./provider.js";
import { scoreHour, summarizeScores } from "./scoring.js";

import type { ForecastHour, ForecastSummary, Spot, Swell } from "../shared/types.js";

export const round = (value: number | null | undefined, digits = 1) =>
  typeof value === "number" && Number.isFinite(value) ? Number(value.toFixed(digits)) : null;

const value = (row: Partial<ProviderRow>, key: string): number | null =>
  typeof row[key] === "number" ? row[key] : null;

export const windRelative = (direction: number | null, speed: number | null, offshore: number) => {
  if (direction === null || speed === null) return null;
  if (speed < 3) return "calm";
  const difference = Math.abs(((direction - offshore + 540) % 360) - 180);
  if (difference <= 45) return "offshore";
  if (difference < 75) return "cross-offshore";
  if (difference <= 105) return "cross-shore";
  if (difference < 135) return "cross-onshore";
  return "onshore";
};

export const compass = (degrees: number | null) => {
  if (degrees === null || !Number.isFinite(degrees)) return null;
  const points = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return points[Math.round(degrees / 22.5) % 16];
};

const swell = (row: Partial<ProviderRow>, prefix: string): Swell => ({
  heightM: value(row, `${prefix}_height`),
  periodS: value(row, `${prefix}_period`),
  directionDeg: value(row, `${prefix}_direction`),
  direction: compass(value(row, `${prefix}_direction`)),
});

export const normalizeHour = (
  localTime: string,
  weather: Partial<ProviderRow> = {},
  marine: Partial<ProviderRow> = {},
  spot: Spot,
): ForecastHour => {
  const hour: Omit<ForecastHour, "scores"> = {
    time: (weather.time ?? marine.time)!,
    localTime,
    isDay: Number.isFinite(weather.is_day) ? weather.is_day === 1 : null,
    airTemperatureC: value(weather, "temperature_2m"),
    waterTemperatureC: value(marine, "sea_surface_temperature"),
    precipitationMm: value(weather, "precipitation"),
    precipitationProbabilityPct: value(weather, "precipitation_probability"),
    weatherCode: value(weather, "weather_code"),
    wind: {
      speedKmh: value(weather, "wind_speed_10m"),
      gustKmh: value(weather, "wind_gusts_10m"),
      fromDeg: value(weather, "wind_direction_10m"),
      from: compass(value(weather, "wind_direction_10m")),
      relative: windRelative(
        value(weather, "wind_direction_10m"),
        value(weather, "wind_speed_10m"),
        spot.offshoreFromDegrees,
      ),
    },
    waves: swell(marine, "wave"),
    primarySwell: swell(marine, "swell_wave"),
    secondarySwell: swell(marine, "secondary_swell_wave"),
    estimatedSurfHeightM:
      typeof marine.wave_height === "number"
        ? round(marine.wave_height * spot.surfHeightFactor, 2)
        : null,
  };
  return { ...hour, scores: scoreHour(hour, spot) };
};

const range = (values: (number | null)[]) => {
  const present = values.filter((item): item is number => item !== null && Number.isFinite(item));
  return present.length
    ? { min: Number(Math.min(...present).toFixed(1)), max: Number(Math.max(...present).toFixed(1)) }
    : null;
};

export const summarize = (hours: ForecastHour[]): ForecastSummary => {
  const daylight = hours.filter((hour) => hour.isDay === true);
  const windHours = daylight.filter((hour) => hour.wind.speedKmh !== null);
  const lightest = windHours.reduce<ForecastHour | null>(
    (best, hour) => (!best || hour.wind.speedKmh! < best.wind.speedKmh! ? hour : best),
    null,
  );
  const rain = hours.map((hour) => hour.precipitationMm);
  return {
    swellHeightM: range(hours.map((hour) => hour.primarySwell.heightM)),
    waveHeightM: range(hours.map((hour) => hour.waves.heightM)),
    scores: {
      surfing: summarizeScores(hours, "surfing"),
      fishing: summarizeScores(hours, "fishing"),
      rockFishing: summarizeScores(hours, "rockFishing"),
      inshoreFishing: summarizeScores(hours, "inshoreFishing"),
    },
    estimatedSurfHeightM: range(hours.map((hour) => hour.estimatedSurfHeightM)),
    windSpeedKmh: range(hours.map((hour) => hour.wind.speedKmh)),
    waterTemperatureC: range(hours.map((hour) => hour.waterTemperatureC)),
    airTemperatureC: range(hours.map((hour) => hour.airTemperatureC)),
    precipitationTotalMm: rain.every((item): item is number => item !== null)
      ? round(
          rain.reduce((a, b) => a + b, 0),
          2,
        )
      : null,
    lightestDaylightWind: lightest
      ? {
          localTime: lightest.localTime,
          speedKmh: lightest.wind.speedKmh!,
          relative: lightest.wind.relative,
        }
      : null,
  };
};
