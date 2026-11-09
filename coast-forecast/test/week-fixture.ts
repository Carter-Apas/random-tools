import { fixture } from "./fixtures.js";

import { addDays, localTimestamp } from "../server/dates.js";
import type { ProviderData } from "../server/provider.js";

export const weekFixture = (
  marine: boolean,
  first: string,
  count = 7,
  start = Date.parse(`${first}T00:00:00+13:00`) / 1000,
  end = start + count * 86400,
): ProviderData => {
  const data = fixture(marine);
  const dates = Array.from({ length: count }, (_, index) => addDays(first, index));
  const times = Array.from({ length: (end - start) / 3600 }, (_, index) => start + index * 3600);
  const localTimes = times.map(localTimestamp);
  const hourly = Object.fromEntries(
    Object.entries(data.hourly)
      .filter(([key]) => key !== "time")
      .map(([key, values]) => [key, times.map((_, index) => values[index % 24])]),
  );
  if (marine) hourly.wave_height = localTimes.map((time) => dates.indexOf(time.slice(0, 10)) + 1);
  else
    hourly.is_day = localTimes.map((time) => {
      const hour = Number(time.slice(11, 13));
      return hour >= 6 && hour < 20 ? 1 : 0;
    });
  return {
    ...data,
    hourly: { time: times, ...hourly },
    daily: marine
      ? undefined
      : {
          time: dates.map((date) => Date.parse(`${date}T00:00:00+13:00`) / 1000),
          sunrise: dates.map((date) => Date.parse(`${date}T06:00:00+13:00`) / 1000),
          sunset: dates.map((date) => Date.parse(`${date}T20:00:00+13:00`) / 1000),
        },
  };
};

export const weekFetch: typeof fetch = async (input) => {
  const url = new URL(String(input));
  return Response.json(
    weekFixture(url.hostname.includes("marine-api"), url.searchParams.get("start_date")!),
  );
};
