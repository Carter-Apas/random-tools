import { element, escape } from "./format";

import type { Forecast } from "../shared/types";

const coordinates = (point: { latitude: number; longitude: number } | null): string =>
  point ? `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}` : "Unavailable";

export const renderForecastSource = (forecast: Forecast): void => {
  const { source, spot } = forecast;
  const sources = [
    {
      kind: "weather" as const,
      label: "Wind & weather",
      requested: { latitude: spot.latitude, longitude: spot.longitude },
    },
    {
      kind: "marine" as const,
      label: "Waves & water temperature",
      requested: { latitude: spot.marineLatitude, longitude: spot.marineLongitude },
    },
  ];
  element("model-details").innerHTML = sources
    .map(
      ({ kind, label }) => `<div class="model-source">
        <h4>${escape(label)}</h4>
        <p>${escape(source.models[kind].resolvedModel ?? "Automatic · Open-Meteo Best Match")}</p>
        <a href="${escape(source[kind])}" target="_blank" rel="noopener">${kind === "weather" ? "Weather" : "Marine"} API documentation ↗</a>
        ${source.modelGrid[kind] ? "" : '<p class="model-unavailable">Source unavailable for this forecast</p>'}
      </div>`,
    )
    .join("");
  element("sampling-details").innerHTML = sources
    .map(
      ({ kind, label, requested }) => `<div class="model-source">
        <h4>${escape(label)}</h4>
        <dl><dt>Requested location</dt><dd>${coordinates(requested)}</dd>
        <dt>Reported grid point</dt><dd>${coordinates(source.modelGrid[kind])}</dd></dl>
      </div>`,
    )
    .join("");
};
