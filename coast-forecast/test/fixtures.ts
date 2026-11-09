import { loadSpots } from "../server/spots.js";
import type { ProviderData } from "../server/provider.js";

export const date = "2026-11-10";
export const initial = new Date("2026-11-09T07:00:00Z");

export const now = () => new Date(initial);

export const [piha, teArai] = await loadSpots();
export const start = Date.parse(`${date}T00:00:00+13:00`) / 1000;

export const fixture = (marine: boolean): ProviderData => ({
  latitude: marine ? -36.95 : -36.954,
  longitude: marine ? 174.4 : 174.468,
  utc_offset_seconds: 46800,
  hourly: {
    time: Array.from({ length: 24 }, (_, index) => start + index * 3600),
    ...(marine
      ? {
          wave_height: Array(24).fill(1.6) as number[],
          swell_wave_height: Array(24).fill(1.4) as number[],
          swell_wave_period: Array(24).fill(13) as number[],
          swell_wave_direction: Array(24).fill(240) as number[],
          sea_surface_temperature: Array(24).fill(17.2) as number[],
        }
      : {
          temperature_2m: Array(24).fill(19) as number[],
          wind_speed_10m: Array.from({ length: 24 }, (_, index) => (index === 8 ? 5 : 15)),
          wind_direction_10m: Array(24).fill(90) as number[],
          wind_gusts_10m: Array(24).fill(24) as number[],
          precipitation: Array.from({ length: 24 }, (_, index) => (index === 9 ? 0.6 : 0)),
          precipitation_probability: Array(24).fill(10) as number[],
          weather_code: Array(24).fill(2) as number[],
          is_day: Array.from({ length: 24 }, (_, index) => (index >= 6 && index <= 19 ? 1 : 0)),
        }),
  },
  daily: marine ? undefined : { sunrise: [start + 6 * 3600], sunset: [start + 20 * 3600] },
});

export const stubFetch: typeof fetch = async (input) =>
  Response.json(fixture(String(input).includes("marine-api")));
