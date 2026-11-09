import { escape, hourLabel, number } from "./format";

import type { ForecastHour } from "../shared/types";

interface Series {
  values: (number | null)[];
  color: string;
  label: string;
  bars?: boolean;
}

let width = 900;
const height = 150;
const left = 40;
const right = 20;
const top = 15;
const bottom = 28;
let plot = width - left - right;

const x = (index: number, count: number) => left + ((index + 0.5) * plot) / count;

const drawSeries = (series: Series, max: number, count: number): string => {
  const y = (value: number) => height - bottom - (value / max) * (height - bottom - top);

  if (series.bars)
    return series.values
      .map((value, index) =>
        value === null
          ? ""
          : `<rect x="${x(index, count) - (plot / count) * 0.31}" y="${y(value)}" width="${(plot / count) * 0.62}" height="${height - bottom - y(value)}" rx="2" fill="${series.color}"><title>${escape(series.label)}: ${number(value)}</title></rect>`,
      )
      .join("");
  let connected = false;
  const path = series.values
    .map((value, index) => {
      if (value === null) {
        connected = false;
        return "";
      }
      const command = connected ? "L" : "M";
      connected = true;
      return `${command}${x(index, count)},${y(value)}`;
    })
    .join(" ");
  return `<path d="${path}" fill="none" stroke="${series.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${series.values.map((value, index) => (value === null ? "" : `<circle cx="${x(index, count)}" cy="${y(value)}" r="2.5" fill="${series.color}"><title>${escape(series.label)}: ${number(value)}</title></circle>`)).join("")}`;
};

export const chart = (
  hours: ForecastHour[],
  selected: number,
  series: Series[],
  label: string,
  minimum: number,
  maximum?: number,
): string => {
  const values = series
    .flatMap((item) => item.values)
    .filter((value): value is number => value !== null);
  if (!values.length) return '<div class="chart-empty">This forecast field is unavailable.</div>';
  const max = maximum ?? Math.max(minimum, Math.ceil(Math.max(...values) * 1.15 * 10) / 10);
  const grid = [0, 0.5, 1]
    .map((fraction) => {
      const y = height - bottom - fraction * (height - bottom - top);
      return `<line x1="${left}" x2="${width - right}" y1="${y}" y2="${y}" class="grid-line"/><text x="${left - 9}" y="${y + 4}" text-anchor="end">${number(max * fraction)}</text>`;
    })
    .join("");
  const ticks = hours
    .map((hour, index) =>
      [0, 6, 12, 18, hours.length - 1].includes(index)
        ? `<text x="${x(index, hours.length)}" y="${height - 6}" text-anchor="middle">${hourLabel(hour.localTime)}</text>`
        : "",
    )
    .join("");
  const selectedX = x(selected, hours.length);
  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="forecast-chart" role="img" aria-label="${escape(label)}. Use the time slider for hourly values.">${grid}${series.map((item) => drawSeries(item, max, hours.length)).join("")}<line x1="${selectedX}" x2="${selectedX}" y1="4" y2="${height - bottom}" class="selection-line"/><circle cx="${selectedX}" cy="5" r="3" class="selection-dot"/>${ticks}</svg>`;
};

const panel = (
  title: string,
  value: string,
  unit: string,
  note: string,
  graph: string,
  color: string,
): string =>
  `<div class="chart-panel"><div class="chart-description"><h3><span class="series-dot" style="background:${color}"></span>${title}</h3><p class="chart-value">${value}<span>${unit}</span></p><p class="chart-note">${note}</p></div><div class="chart-area">${graph}</div></div>`;

export const renderCharts = (
  hours: ForecastHour[],
  selected: number,
  availableWidth = 900,
): string => {
  width = Math.max(250, availableWidth);
  plot = width - left - right;
  const hour = hours[selected];
  const swell = "var(--sea)";
  const wind = "var(--wind)";
  const rain = "var(--rain)";
  return [
    panel(
      "Conditions",
      number(hour.scores.surfing.value, 0),
      "/100 surf",
      `Rocks ${number(hour.scores.rockFishing.value, 0)} · Inshore ${number(hour.scores.inshoreFishing.value, 0)}<span class="legend"><i style="background:${swell}"></i>Surf <i style="background:${wind}"></i>Rocks <i style="background:${rain}"></i>Inshore</span>`,
      chart(
        hours,
        selected,
        [
          {
            values: hours.map((item) => item.scores.surfing.value),
            color: swell,
            label: "Surfing score /100",
          },
          {
            values: hours.map((item) => item.scores.rockFishing.value),
            color: wind,
            label: "Rock fishing score /100",
          },
          {
            values: hours.map((item) => item.scores.inshoreFishing.value),
            color: rain,
            label: "Inshore fishing score /100",
          },
        ],
        "Surfing, rock fishing and inshore boat fishing conditions scores out of 100",
        100,
        100,
      ),
      swell,
    ),
    panel(
      "Wave height",
      number(hour.waves.heightM),
      "m",
      `Total significant waves<span class="legend"><i style="background:${swell}"></i>Waves <i style="background:var(--mono-subtle)"></i>Primary swell</span>`,
      chart(
        hours,
        selected,
        [
          {
            values: hours.map((item) => item.waves.heightM),
            color: swell,
            label: "Total wave height (m)",
            bars: true,
          },
          {
            values: hours.map((item) => item.primarySwell.heightM),
            color: "var(--mono-subtle)",
            label: "Primary swell height (m)",
          },
        ],
        "Total significant wave and primary swell height in metres",
        0.5,
      ),
      swell,
    ),
    panel(
      "Wind",
      number(hour.wind.speedKmh, 0),
      "km/h",
      `${number(hour.wind.gustKmh, 0)} km/h gusts · ${escape(hour.wind.from)}<br>${escape(hour.wind.relative ?? "Orientation unavailable")}<span class="legend"><i style="background:${wind}"></i>Wind <i class="gust-key"></i>Gusts</span>`,
      chart(
        hours,
        selected,
        [
          {
            values: hours.map((item) => item.wind.gustKmh),
            color: "var(--mono-subtle)",
            label: "Wind gust (km/h)",
          },
          {
            values: hours.map((item) => item.wind.speedKmh),
            color: wind,
            label: "Wind (km/h)",
            bars: true,
          },
        ],
        "Wind and gust speed in kilometres per hour",
        10,
      ),
      wind,
    ),
    panel(
      "Rain",
      number(hour.precipitationMm),
      "mm",
      `${number(hour.precipitationProbabilityPct, 0)}% chance<br>Preceding hour`,
      chart(
        hours,
        selected,
        [
          {
            values: hours.map((item) => item.precipitationMm),
            color: rain,
            label: "Precipitation (mm)",
            bars: true,
          },
        ],
        "Hourly precipitation in millimetres",
        1,
      ),
      rain,
    ),
    panel(
      "Temperature",
      number(hour.waterTemperatureC),
      "°C water",
      `${number(hour.airTemperatureC)}°C air<span class="legend"><i style="background:${swell}"></i>Water <i style="background:var(--mono-accent-text)"></i>Air</span>`,
      chart(
        hours,
        selected,
        [
          {
            values: hours.map((item) => item.airTemperatureC),
            color: "var(--mono-accent-text)",
            label: "Air temperature (°C)",
          },
          {
            values: hours.map((item) => item.waterTemperatureC),
            color: swell,
            label: "Sea surface temperature (°C)",
          },
        ],
        "Air and sea surface temperature in Celsius",
        10,
      ),
      swell,
    ),
  ].join("");
};

export const chartHour = (event: MouseEvent, count: number): number | null => {
  if (!(event.target instanceof Element)) return null;
  const svg = event.target.closest("svg.forecast-chart");
  if (!svg) return null;
  const bounds = svg.getBoundingClientRect();
  const relative = (((event.clientX - bounds.left) / bounds.width) * width - left) / plot;
  return Math.max(0, Math.min(count - 1, Math.floor(relative * count)));
};
