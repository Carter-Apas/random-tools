import { escape, hourLabel, number } from "./format";

import type { ForecastHour } from "../shared/types";

export const windTimeline = (
  hours: ForecastHour[],
  selected: number,
  width: number,
  left: number,
  right: number,
): string => {
  const plot = width - left - right;
  const step = Math.max(1, Math.ceil(38 / (plot / hours.length)));

  const x = (index: number) => left + ((index + 0.5) * plot) / hours.length;

  const cells = hours
    .map((hour, index) => {
      if (index !== selected && (index % step !== 0 || Math.abs(index - selected) < step * 0.75))
        return "";
      const wind = hour.wind;
      const arrow =
        wind.fromDeg === null
          ? '<text y="17" text-anchor="middle">—</text>'
          : `<g transform="translate(0,13) rotate(${wind.fromDeg})"><path d="M0 -8V8M-4 3L0 8L4 3" class="wind-hour-arrow"/></g>`;
      const description = `${hourLabel(hour.localTime)}: wind ${number(wind.speedKmh, 0)} km/h, gusts ${number(wind.gustKmh, 0)} km/h, from ${wind.from ?? "unavailable"} (${number(wind.fromDeg, 0)}°), ${wind.relative ?? "orientation unavailable"}`;
      return `<g data-wind-hour="${index}" transform="translate(${x(index)},0)" class="wind-hour${index === selected ? " is-selected" : ""}"><title>${escape(description)}</title>${arrow}<text y="40" text-anchor="middle" class="wind-hour-speed">${number(wind.speedKmh, 0)}</text><text y="55" text-anchor="middle" class="wind-hour-gust">${number(wind.gustKmh, 0)}</text><text y="76" text-anchor="middle" class="wind-hour-time">${hourLabel(hour.localTime)}</text></g>`;
    })
    .join("");
  return `<svg class="wind-direction-strip" viewBox="0 0 ${width} 86" preserveAspectRatio="none" role="img" aria-label="Hourly wind direction arrows, speed and gusts in km/h. Arrows point in the direction the wind travels. Use the time slider to select an hour."><line x1="${x(selected)}" x2="${x(selected)}" y1="0" y2="60" class="selection-line"/>${cells}</svg>`;
};
