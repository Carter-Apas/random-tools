import { addDays, localDate } from "./dates.js";
import { fetchProvider, providerRows, providerUrl } from "./provider.js";
import type { ProviderData, ProviderRow } from "./provider.js";

import type { Spot } from "../shared/types.js";

interface CacheEntry {
  weather: ProviderData | null;
  marine: ProviderData | null;
  weatherRows: Map<string, ProviderRow>;
  marineRows: Map<string, ProviderRow>;
  fetchedAt: string;
  warnings: string[];
}

export class ForecastUnavailable extends Error {}

export const createForecastCache = ({
  fetcher,
  now,
  apiKey,
}: {
  fetcher: typeof fetch;
  now: () => Date;
  apiKey?: string;
}) => {
  const cache = new Map<string, CacheEntry>();
  const pending = new Map<string, Promise<CacheEntry>>();
  const ttl = 60 * 60 * 1000;
  const staleLimit = 6 * ttl;

  const refresh = async (spot: Spot, start: string, key: string): Promise<CacheEntry> => {
    const results = await Promise.allSettled(
      ["weather", "marine"].map((kind) =>
        fetchProvider(providerUrl(kind, spot, start, apiKey, addDays(start, 6)), fetcher),
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
      weather,
      marine,
      weatherRows: providerRows(weather),
      marineRows: providerRows(marine),
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

  return async (spot: Spot): Promise<CacheEntry & { stale: boolean }> => {
    const start = localDate(now());
    const key = `${spot.latitude}:${spot.longitude}:${spot.marineLatitude}:${spot.marineLongitude}:${start}`;
    for (const [cacheKey, entry] of cache)
      if (now().getTime() - Date.parse(entry.fetchedAt) > staleLimit) cache.delete(cacheKey);
    const cached = cache.get(key);
    const age = cached ? now().getTime() - Date.parse(cached.fetchedAt) : Infinity;
    if (cached && age < ttl) return { ...cached, stale: false };
    if (!pending.has(key))
      pending.set(
        key,
        refresh(spot, start, key).finally(() => pending.delete(key)),
      );
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
};
