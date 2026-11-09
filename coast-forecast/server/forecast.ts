import { normalizeHour, summarize } from "./conditions.js";
import { localTimestamp, timezone } from "./dates.js";
import { daylight } from "./daylight.js";
import { fetchProvider, providerRows, providerUrl } from "./provider.js";
import type { ProviderData } from "./provider.js";

import type { Forecast, Spot } from "../shared/types.js";

interface CacheEntry {
  weather: ProviderData | null;
  marine: ProviderData | null;
  fetchedAt: string;
  warnings: string[];
}

export class ForecastUnavailable extends Error {}

export const createForecastService = ({
  fetcher = fetch,
  now = () => new Date(),
  apiKey,
}: { fetcher?: typeof fetch; now?: () => Date; apiKey?: string } = {}) => {
  const cache = new Map<string, CacheEntry>();
  const pending = new Map<string, Promise<CacheEntry>>();
  const ttl = 60 * 60 * 1000;
  const staleLimit = 6 * 60 * 60 * 1000;

  const refresh = async (spot: Spot, date: string, key: string): Promise<CacheEntry> => {
    const results = await Promise.allSettled(
      ["weather", "marine"].map((kind) =>
        fetchProvider(providerUrl(kind, spot, date, apiKey), fetcher),
      ),
    );
    if (results.every((result) => result.status === "rejected"))
      throw new ForecastUnavailable(
        "Weather and marine forecasts are unavailable. Try again shortly.",
      );
    const [weather, marine] = results.map((result) =>
      result.status === "fulfilled" ? result.value : null,
    );
    const entry: CacheEntry = {
      weather: weather ?? null,
      marine: marine ?? null,
      fetchedAt: now().toISOString(),
      warnings: results.flatMap((result, index) =>
        result.status === "rejected"
          ? [`${index ? "Marine" : "Weather"} forecast unavailable; missing values are null.`]
          : [],
      ),
    };
    const previous = cache.get(key);
    if (previous && !previous.warnings.length && entry.warnings.length)
      throw new ForecastUnavailable("A forecast source is temporarily unavailable.");
    cache.set(key, entry);
    return entry;
  };

  const getRaw = async (spot: Spot, date: string): Promise<CacheEntry & { stale: boolean }> => {
    const key = `${spot.id}:${spot.latitude}:${spot.longitude}:${spot.marineLatitude}:${spot.marineLongitude}:${date}`;
    for (const [cacheKey, entry] of cache) {
      if (now().getTime() - Date.parse(entry.fetchedAt) > staleLimit) cache.delete(cacheKey);
    }
    const cached = cache.get(key);
    const age = cached ? now().getTime() - Date.parse(cached.fetchedAt) : Infinity;
    if (cached && age < ttl) return { ...cached, stale: false };
    if (!pending.has(key)) {
      pending.set(
        key,
        refresh(spot, date, key).finally(() => pending.delete(key)),
      );
    }
    try {
      return { ...(await pending.get(key)!), stale: false };
    } catch (error) {
      if (!cached || age > staleLimit) throw error;
      return {
        ...cached,
        stale: true,
        warnings: [
          ...cached.warnings,
          "Showing a cached forecast because the provider could not be refreshed.",
        ],
      };
    }
  };

  return async (spot: Spot, date: string): Promise<Forecast> => {
    const raw = await getRaw(spot, date);
    const weather = providerRows(raw.weather);
    const marine = providerRows(raw.marine);
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
      sunrise: dailyTime(raw.weather, "sunrise"),
      sunset: dailyTime(raw.weather, "sunset"),
      ...daylight(date, spot),
      summary: summarize(hours),
      hours,
    };
  };
};

const grid = (data: ProviderData | null) =>
  data ? { latitude: data.latitude, longitude: data.longitude } : null;

const dailyTime = (data: ProviderData | null, key: "sunrise" | "sunset") => {
  const value = data?.daily?.[key]?.[0];
  return typeof value === "number" ? localTimestamp(value) : null;
};
