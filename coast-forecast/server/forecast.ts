import { normalizeHour, summarize } from "./conditions.js";
import { localTimestamp, timezone } from "./dates.js";
import { daylight } from "./daylight.js";
import { createForecastCache, ForecastUnavailable } from "./forecast-cache.js";
import type { ProviderData } from "./provider.js";

import type { Forecast, Spot } from "../shared/types.js";

export { ForecastUnavailable } from "./forecast-cache.js";

export const createForecastService = ({
  fetcher = fetch,
  now = () => new Date(),
  apiKey,
}: { fetcher?: typeof fetch; now?: () => Date; apiKey?: string } = {}) => {
  const getRaw = createForecastCache({ fetcher, now, apiKey });

  return async (spot: Spot, date: string): Promise<Forecast> => {
    const raw = await getRaw(spot);
    const weather = raw.weatherRows;
    const marine = raw.marineRows;
    const times = [...new Set([...weather.keys(), ...marine.keys()])]
      .filter((time) => (weather.get(time) ?? marine.get(time))?.localTime.startsWith(date))
      .sort();
    if (!times.length)
      throw new ForecastUnavailable("The provider returned no hours for the requested date.");
    const hours = times.map((time) =>
      normalizeHour(
        (weather.get(time) ?? marine.get(time))!.localTime,
        weather.get(time),
        marine.get(time),
        spot,
      ),
    );
    const warnings = [...raw.warnings];
    if (hours.some((hour) => hour.waterTemperatureC === null))
      warnings.push("Sea surface temperature is unavailable for some hours.");
    return {
      spot,
      date,
      timezone,
      fetchedAt: raw.fetchedAt,
      stale: raw.stale,
      warnings,
      source: {
        name: "Open-Meteo",
        weather: "https://open-meteo.com/en/docs",
        marine: "https://open-meteo.com/en/docs/marine-weather-api",
        licence: "CC BY 4.0",
        modelGrid: {
          weather: grid(raw.weather),
          marine: grid(raw.marine),
        },
      },
      units: {
        height: "m",
        period: "s",
        wind: "km/h",
        temperature: "°C",
        precipitation: "mm",
        direction: "degrees true; direction FROM",
      },
      surfEstimate: {
        method: "total significant wave height × surfHeightFactor",
        factor: spot.surfHeightFactor,
        calibrated: spot.calibrated,
        note: "A simple local proxy, not a nearshore surf model. Raw swell and waves are preserved. No tide, bathymetry or shelter modelling.",
      },
      scoring: {
        version: "curves-v2",
        scale: "0–100; earned points / sum of enabled curve maxima × 100, clamped to 0–100",
        note: "Personal conditions heuristic, not a catch prediction or safety rating. Fishing combines rock and inshore boat fishing using the lower score. Daily scores average available daylight hours. Tides, access, local hazards and species are not modelled.",
      },
      sunrise: dailyTime(raw.weather, "sunrise", date),
      sunset: dailyTime(raw.weather, "sunset", date),
      ...daylight(date, spot),
      summary: summarize(hours),
      hours,
    };
  };
};

const grid = (data: ProviderData | null) =>
  data ? { latitude: data.latitude, longitude: data.longitude } : null;

const dailyTime = (data: ProviderData | null, key: "sunrise" | "sunset", date: string) => {
  const value = data?.daily?.[key]?.find(
    (time) => typeof time === "number" && localTimestamp(time).startsWith(date),
  );
  return typeof value === "number" ? localTimestamp(value) : null;
};
