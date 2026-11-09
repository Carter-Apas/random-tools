import { addDays, localDate, timezone } from "./dates.js";

import type {
  Forecast,
  Outlook,
  OutlookDay,
  OutlookPeriod,
  Spot,
  ForecastHour,
  ProfileActivity,
} from "../shared/types.js";

type GetForecast = (spot: Spot, date: string) => Promise<Forecast>;

const period = (forecast: Forecast, hour: 6 | 12 | 18): OutlookPeriod => {
  const sample = forecast.hours.find((item) => Number(item.localTime.slice(11, 13)) === hour);
  return {
    hour,
    localTime: sample?.localTime ?? null,
    wind: sample?.wind ?? null,
    scores: {
      surfing: sampleScore(sample, "surfing"),
      rockFishing: sampleScore(sample, "rockFishing"),
      inshoreFishing: sampleScore(sample, "inshoreFishing"),
    },
  };
};

export const getOutlook = async (
  spot: Spot,
  getForecast: GetForecast,
  now: Date,
): Promise<Outlook> => {
  const startDate = localDate(now);
  const dates = Array.from({ length: 7 }, (_, index) => addDays(startDate, index));
  const results = await Promise.allSettled(dates.map((date) => getForecast(spot, date)));
  const days: OutlookDay[] = results.map((result, index) => {
    if (result.status === "rejected")
      return {
        date: dates[index],
        fetchedAt: null,
        stale: false,
        warnings: [],
        summary: null,
        periods: [],
        error: "Forecast unavailable for this day. Try again shortly.",
      };
    const forecast = result.value;
    return {
      date: dates[index],
      fetchedAt: forecast.fetchedAt,
      stale: forecast.stale,
      warnings: forecast.warnings,
      summary: forecast.summary,
      periods: ([6, 12, 18] as const).map((hour) => period(forecast, hour)),
      error: null,
    };
  });
  return {
    spot: { id: spot.id, name: spot.name, coast: spot.coast },
    timezone,
    startDate,
    endDate: dates.at(-1)!,
    days,
  };
};

export const outlookResponse = async (
  params: URLSearchParams,
  spots: Spot[],
  getForecast: GetForecast,
  now: Date,
) => {
  for (const key of params.keys()) {
    if (key !== "spot" || params.getAll(key).length !== 1)
      return {
        status: 400,
        body: { error: { code: "invalid_request", message: "Use one spot parameter only." } },
      };
  }
  const spot = spots.find((item) => item.id === params.get("spot"));
  if (!spot)
    return {
      status: 400,
      body: {
        error: {
          code: "invalid_request",
          message: "Select a place with ?spot=ID. See /api/spots.",
        },
      },
    };
  const body = await getOutlook(spot, getForecast, now);
  return { status: body.days.some((day) => day.summary !== null) ? 200 : 503, body };
};

const sampleScore = (sample: ForecastHour | undefined, activity: ProfileActivity) =>
  sample?.scores[activity].value ?? null;
