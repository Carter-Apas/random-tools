import { getTimes } from "suncalc";

import { localTimestamp } from "./dates.js";

import type { Spot } from "../shared/types.js";

const localTime = (time: Date | null): string | null =>
  time && Number.isFinite(time.getTime()) ? localTimestamp(time.getTime() / 1000) : null;

export const daylight = (date: string, spot: Pick<Spot, "latitude" | "longitude">) => {
  const anchor = new Date(`${date}T00:00:00Z`);
  const local = localTimestamp(anchor.getTime() / 1000);
  const offsetMinutes = (Date.parse(`${local}Z`) - anchor.getTime()) / 60000;
  const times = getTimes(anchor, spot.latitude, spot.longitude, 0, offsetMinutes);
  return { firstLight: localTime(times.dawn), lastLight: localTime(times.dusk) };
};
