import { localTimestamp, timezone } from "./dates.js";

import type { Spot } from "../shared/types.js";

export interface ProviderData {
  latitude: number;
  longitude: number;
  utc_offset_seconds: number;
  error?: boolean;
  hourly: { time: number[]; [key: string]: (number | null)[] };
  daily?: { sunrise?: number[]; sunset?: number[] };
}

export type ProviderRow = Record<string, number | string | null> & {
  time: string;
  localTime: string;
};

const weatherFields = [
  "temperature_2m",
  "precipitation",
  "precipitation_probability",
  "wind_speed_10m",
  "wind_gusts_10m",
  "wind_direction_10m",
  "weather_code",
  "is_day",
];
const marineFields = [
  "wave_height",
  "wave_direction",
  "wave_period",
  "swell_wave_height",
  "swell_wave_direction",
  "swell_wave_period",
  "secondary_swell_wave_height",
  "secondary_swell_wave_direction",
  "secondary_swell_wave_period",
  "sea_surface_temperature",
];

export const providerUrl = (kind: string, spot: Spot, date: string, apiKey?: string) => {
  const marine = kind === "marine";
  const prefix = apiKey ? "customer-" : "";
  const host = marine ? `${prefix}marine-api` : `${prefix}api`;
  const url = new URL(`https://${host}.open-meteo.com/v1/${marine ? "marine" : "forecast"}`);
  url.search = new URLSearchParams({
    latitude: String(marine ? spot.marineLatitude : spot.latitude),
    longitude: String(marine ? spot.marineLongitude : spot.longitude),
    hourly: (marine ? marineFields : weatherFields).join(","),
    timezone,
    timeformat: "unixtime",
    start_date: date,
    end_date: date,
    ...(marine
      ? { cell_selection: "sea" }
      : { daily: "sunrise,sunset", wind_speed_unit: "kmh", precipitation_unit: "mm" }),
  }).toString();
  if (apiKey) url.searchParams.set("apikey", apiKey);
  return url;
};

export const fetchProvider = async (
  url: URL,
  fetcher: typeof fetch = fetch,
): Promise<ProviderData> => {
  const response = await fetcher(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Forecast provider returned HTTP ${response.status}.`);
  const data = (await response.json()) as ProviderData;
  if (
    data.error ||
    !Array.isArray(data.hourly?.time) ||
    !data.hourly.time.length ||
    !Number.isFinite(data.utc_offset_seconds)
  )
    throw new Error("Forecast provider returned an invalid hourly forecast.");
  return data;
};

export const providerRows = (data: ProviderData | null): Map<string, ProviderRow> => {
  if (!data) return new Map();
  return new Map(
    data.hourly.time.map((time, index) => [
      new Date(time * 1000).toISOString(),
      {
        time: new Date(time * 1000).toISOString(),
        localTime: localTimestamp(time),
        ...Object.fromEntries(
          Object.entries(data.hourly)
            .filter(([key]) => key !== "time")
            .map(([key, values]) => [key, Number.isFinite(values[index]) ? values[index] : null]),
        ),
      },
    ]),
  );
};
