import { directionArrow, escape, number } from "./format";

import type { OutlookDay, OutlookPeriod, ProfileActivity, Range } from "../shared/types";

const activityLabels = { surfing: "Surf", rockFishing: "Rocks", inshoreFishing: "Boat" };
const periodLabels: Record<number, string> = { 6: "6am", 12: "noon", 18: "6pm" };

const dateParts = (date: string) => {
  const instant = new Date(`${date}T12:00:00Z`);

  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-NZ", { ...options, timeZone: "UTC" }).format(instant);

  return {
    weekday: format({ weekday: "short" }),
    short: format({ day: "numeric", month: "short" }),
    full: format({ weekday: "long", day: "numeric", month: "long" }),
  };
};

export const outlookTone = (score: number | null): string => {
  if (score === null) return "unknown";
  if (score >= 60) return "good";
  return score >= 40 ? "fair" : "poor";
};

const heightText = (range: Range | null | undefined): string => {
  if (!range) return "—";
  return `${number(range.min)}${range.min === range.max ? "" : `–${number(range.max)}`}`;
};

const windDescription = (period: OutlookPeriod): string => {
  const wind = period.wind;
  if (!wind || wind.speedKmh === null) return `${periodLabels[period.hour]}: wind unavailable`;
  const from = wind.from ? ` from ${wind.from}` : "; direction unavailable";
  const relative = wind.relative ? `, ${wind.relative}` : "";
  return `${periodLabels[period.hour]}: ${number(wind.speedKmh, 0)} km/h${from}${relative}`;
};

const windCell = (period: OutlookPeriod, activity: ProfileActivity): string => {
  const wind = period.wind;
  const title = `${windDescription(period)}. ${activityLabels[activity]} score ${number(period.scores[activity], 0)}/100.`;
  return `<span class="outlook-wind-cell" title="${escape(title)}">${wind?.fromDeg === null || !wind ? '<span class="outlook-wind-missing">—</span>' : directionArrow(wind.fromDeg)}<small>${number(wind?.speedKmh, 0)}</small></span>`;
};

const scoreLabel = (score: number | null): string => {
  if (score === null) return "No score";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  return score >= 40 ? "Fair" : "Poor";
};

export const outlookCard = (
  day: OutlookDay,
  index: number,
  activity: ProfileActivity,
  selected: string,
  loading: boolean,
): string => {
  const date = dateParts(day.date);
  const label = ["Today", "Tomorrow"][index] ?? date.weekday;
  const range = heightText(day.summary?.estimatedSurfHeightM);
  const average = day.summary?.scores[activity].average ?? null;
  const periods = day.periods.length ? day.periods : emptyPeriods();
  const description = dayDescription(day, activity, loading);
  return `<button type="button" class="outlook-day" data-date="${day.date}" aria-pressed="${day.date === selected}" aria-describedby="outlook-description-${day.date}" ${!day.summary ? "disabled" : ""}><span class="outlook-date">${label}<small>${date.short}</small></span><strong class="outlook-height">${range}<span>${range === "—" ? "" : " m"}</span></strong><span class="outlook-wind" aria-hidden="true">${periods.map((period) => windCell(period, activity)).join("")}</span><span class="outlook-rating" data-tone="${outlookTone(average)}"><span>${activityLabels[activity]} <b>${number(average, 0)}</b></span><small>${dayStatus(day, average, loading)}</small></span><span class="outlook-bars" aria-hidden="true">${periods.map((period) => `<i data-tone="${outlookTone(period.scores[activity])}"></i>`).join("")}</span></button><span id="outlook-description-${day.date}" hidden>${escape(`${date.full}. ${description}`)}</span>`;
};

export const emptyPeriods = (): OutlookPeriod[] =>
  ([6, 12, 18] as const).map((hour) => ({
    hour,
    localTime: null,
    wind: null,
    scores: { surfing: null, rockFishing: null, inshoreFishing: null },
  }));

const dayDescription = (day: OutlookDay, activity: ProfileActivity, loading: boolean): string => {
  if (loading) return "Loading forecast";
  if (day.error) return day.error;
  const range = heightText(day.summary?.estimatedSurfHeightM);
  const score = day.summary?.scores[activity].average ?? null;
  return `Surf height ${range} metres. ${activityLabels[activity]} daylight score ${number(score, 0)} out of 100. ${day.periods.map(windDescription).join(". ")}${day.stale ? ". Cached forecast" : ""}`;
};

const dayStatus = (day: OutlookDay, score: number | null, loading: boolean): string => {
  if (!day.summary) return loading ? "Loading…" : "Unavailable";
  return `${scoreLabel(score)}${day.stale ? " · cached" : ""}`;
};
