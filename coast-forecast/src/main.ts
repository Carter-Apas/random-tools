import { initMono } from "@random-tools/mono/browser";

import { scoreCards, coastScores } from "./scores-view";
import "@random-tools/mono/styles.css";
import "./styles.css";
import { OutlookStrip } from "./outlook";
import { chartHour, renderCharts } from "./charts";
import {
  directionArrow,
  element,
  escape,
  hourLabel,
  number,
  shortTime,
  weatherLabel,
} from "./format";

import type { Forecast, ForecastHour, Spot } from "../shared/types";

const query = new URLSearchParams(location.search);
let selected = query.get("spot") ?? "piha";
let requestedDate = query.get("date") ?? "tomorrow";
let selectedHour = 6;
let spots: Spot[] = [];
let forecasts = new Map<string, Forecast>();
let failures = new Map<string, string>();
let generation = 0;
let controller: AbortController | undefined;
let currentTomorrow = "";

initMono();

const dateOffset = (days: number): string => {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(
    new Date(),
  );
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
};

const activeDate = (): string => {
  if (requestedDate === "tomorrow") return dateOffset(1);
  if (requestedDate === "today") return dateOffset(0);
  return requestedDate;
};

const endpoint = (id: string): string =>
  `/api/v1/forecast?${new URLSearchParams({ spot: id, date: requestedDate })}`;

const requestJson = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(url, { signal });
  const data = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok)
    throw new Error(data.error?.message ?? `Request failed (HTTP ${response.status}).`);
  return data;
};

const renderPlaces = () => {
  if (!spots.some((spot) => spot.id === selected)) selected = spots[0].id;
  element("forecast-places").innerHTML = spots
    .map(
      (spot) =>
        `<button type="button" class="spot-button" data-spot="${escape(spot.id)}" aria-pressed="${spot.id === selected}"><span class="spot-coast">${escape(spot.coast)}</span><strong>${escape(spot.name)}</strong><span class="spot-preview">Loading forecast…</span></button>`,
    )
    .join("");
};

const load = async (): Promise<void> => {
  const current = ++generation;
  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;
  element("status").textContent = "Fetching the coastal outlook…";
  element("forecast").setAttribute("aria-busy", "true");
  element("error").hidden = true;
  element<HTMLButtonElement>("refresh").disabled = true;
  try {
    const metadata = await requestJson<{ spots: Spot[] }>("/api/v1/spots", signal);
    if (current !== generation) return;
    spots = metadata.spots;
    renderPlaces();
    week.show(
      spots.find((spot) => spot.id === selected)!,
      activeDate(),
      dateOffset(0),
    );
    const results = await Promise.allSettled(
      spots.map((spot) => requestJson<Forecast>(endpoint(spot.id), signal)),
    );
    if (current !== generation) return;
    forecasts = new Map();
    failures = new Map();
    results.forEach((result, index) => {
      const id = spots[index].id;
      if (result.status === "fulfilled") forecasts.set(id, result.value);
      else
        failures.set(
          id,
          result.reason instanceof Error ? result.reason.message : "Unable to load this forecast.",
        );
    });
    element("status").textContent = failures.size
      ? "Some forecasts could not be loaded. Select a location for details."
      : "";
    render();
  } catch (error) {
    if (signal.aborted || current !== generation) return;
    showError(
      error instanceof Error ? error.message : "Unable to load the forecast. Try again shortly.",
    );
    element("status").textContent = "";
  } finally {
    if (current === generation) {
      element("forecast").setAttribute("aria-busy", "false");
      element<HTMLButtonElement>("refresh").disabled = false;
    }
  }
};

const showError = (message: string): void => {
  element("forecast").hidden = true;
  element("error").hidden = false;
  element("error-message").textContent = message;
};

const render = (): void => {
  week.setDate(activeDate());
  document.querySelectorAll<HTMLButtonElement>("[data-spot]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.spot === selected));
    const data = forecasts.get(button.dataset.spot ?? "");
    const preview = button.querySelector(".spot-preview");
    if (preview)
      preview.innerHTML = data
        ? `${escape(previewText(data))}${coastScores(data.summary.scores)}`
        : "Forecast unavailable · try again";
  });
  const link = element<HTMLAnchorElement>("endpoint");
  link.href = endpoint(selected);
  link.textContent = endpoint(selected);
  const forecast = forecasts.get(selected);
  if (!forecast) {
    showError(
      failures.get(selected) ?? "This location’s forecast is unavailable. Try again shortly.",
    );
    return;
  }
  element("forecast").hidden = false;
  element("error").hidden = true;
  element("spot-title").textContent = forecast.spot.name;
  const date = new Intl.DateTimeFormat("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${forecast.date}T12:00:00Z`));
  element("forecast-date").textContent = date;
  element("page-title").textContent =
    forecast.date === dateOffset(1) ? "Tomorrow, on the coast." : "A day on the coast.";
  element<HTMLInputElement>("date").value = forecast.date;
  element("warnings").hidden = !forecast.warnings.length;
  element("warnings").textContent = forecast.warnings.join(" ");
  const lightest = forecast.summary.lightestDaylightWind;
  element("day-note").innerHTML = lightest
    ? `<span class="note-icon" aria-hidden="true">↘</span><p>Lightest daylight wind at <strong>${hourLabel(lightest.localTime)}</strong>: ${number(lightest.speedKmh, 0)} km/h, ${escape(lightest.relative ?? "orientation unavailable")}. <span>${number(forecast.summary.precipitationTotalMm)} mm rain over the day.</span></p>`
    : "Daylight wind outlook unavailable.";
  element("daylight").textContent =
    `Sunrise ${shortTime(forecast.sunrise)} · sunset ${shortTime(forecast.sunset)}`;
  element("spot-note").textContent = forecast.spot.note;
  element("calibration-note").textContent =
    `Surf estimate = total significant wave height × ${number(forecast.surfEstimate.factor, 2)} (${forecast.surfEstimate.calibrated ? "manually calibrated" : "uncalibrated"}). It is a simple proxy; breaking waves can differ. Wind orientation uses ${forecast.spot.offshoreFromDegrees}° as directly offshore.`;
  element("updated").textContent =
    `${forecast.stale ? "Cached forecast" : "Retrieved"} ${new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(forecast.fetchedAt))} NZ time`;
  element("table-caption").textContent = `${forecast.spot.name} · ${date} · Pacific/Auckland`;
  element("hourly-rows").innerHTML = forecast.hours.map(tableRow).join("");
  element<HTMLInputElement>("hour").max = String(forecast.hours.length - 1);
  selectedHour = Math.min(selectedHour, forecast.hours.length - 1);
  renderHour();
};

const previewText = (forecast: Forecast): string => {
  const swell = forecast.summary.waveHeightM;
  const wind = forecast.summary.windSpeedKmh;
  return `${swell ? `${number(swell.min)}–${number(swell.max)} m waves` : "Waves unavailable"} · ${wind ? `${number(wind.min, 0)}–${number(wind.max, 0)} km/h` : "Wind unavailable"}`;
};

const metric = (label: string, value: string, unit: string, note: string, extra = ""): string =>
  `<div class="metric ${extra}"><h4>${label}</h4><p>${value}<span>${unit}</span></p><div class="metric-note">${note}</div></div>`;

const renderHour = (): void => {
  const forecast = forecasts.get(selected);
  if (!forecast) return;
  const hour = forecast.hours[selectedHour];
  const slider = element<HTMLInputElement>("hour");
  slider.value = String(selectedHour);
  slider.setAttribute("aria-valuetext", `${hourLabel(hour.localTime)} New Zealand time`);
  element("selected-time").textContent = hourLabel(hour.localTime);
  element("selected-weather").textContent =
    `${weatherLabel(hour.weatherCode)} · ${number(hour.airTemperatureC)}°C air`;
  element("metrics").innerHTML = [
    metric(
      "Wave height",
      number(hour.waves.heightM),
      "m",
      "Total significant wave height",
      "metric-swell",
    ),
    metric(
      "Surf estimate",
      number(hour.estimatedSurfHeightM),
      "m",
      forecast.surfEstimate.calibrated ? "Manually calibrated" : "Approximate · uncalibrated",
    ),
    metric(
      "Wind",
      number(hour.wind.speedKmh, 0),
      "km/h",
      `${directionArrow(hour.wind.fromDeg)}${escape(hour.wind.from)} · ${escape(hour.wind.relative ?? "unavailable")}`,
    ),
    metric("Water temperature", number(hour.waterTemperatureC), "°C", "Sea surface model"),
    metric(
      "Rain",
      number(hour.precipitationMm),
      "mm",
      `${number(hour.precipitationProbabilityPct, 0)}% chance · preceding hour`,
    ),
    `<div class="metric metric-light"><h4>First & last light</h4><dl><div><dt>First light</dt><dd>${shortTime(forecast.firstLight)}</dd></div><div><dt>Last light</dt><dd>${shortTime(forecast.lastLight)}</dd></div></dl><div class="metric-note">Civil twilight · NZ time</div></div>`,
  ].join("");
  element("swell-detail").innerHTML =
    `${directionArrow(hour.primarySwell.directionDeg)} Primary swell ${number(hour.primarySwell.heightM)} m at ${number(hour.primarySwell.periodS)}s · ${escape(hour.primarySwell.direction)} ${number(hour.primarySwell.directionDeg, 0)}° · Secondary swell ${number(hour.secondarySwell.heightM)} m at ${number(hour.secondarySwell.periodS)}s ${escape(hour.secondarySwell.direction)}`;
  element("scores").innerHTML = scoreCards(hour.scores);
  element("fishing-score").textContent =
    `Combined fishing ${number(hour.scores.fishing.value, 0)}/100 · lower of rock and inshore scores`;
  const chartWidth =
    element("charts").clientWidth - (innerWidth <= 540 ? 26 : innerWidth <= 760 ? 158 : 218);
  element("charts").innerHTML = renderCharts(forecast.hours, selectedHour, chartWidth);
  document.querySelectorAll<HTMLTableRowElement>("#hourly-rows tr").forEach((row, index) => {
    row.classList.toggle("selected-row", index === selectedHour);
  });
};

const tableRow = (hour: ForecastHour): string => {
  const values = [
    hourLabel(hour.localTime),
    `${number(hour.primarySwell.heightM)} m`,
    `${number(hour.primarySwell.periodS)} s`,
    `${hour.primarySwell.direction ?? "—"} ${number(hour.primarySwell.directionDeg, 0)}°`,
    `${number(hour.waves.heightM)} m`,
    `≈ ${number(hour.estimatedSurfHeightM)} m`,
    `${number(hour.wind.speedKmh, 0)} km/h`,
    `${number(hour.wind.gustKmh, 0)} km/h`,
    `${hour.wind.from ?? "—"} · ${hour.wind.relative ?? "—"}`,
    `${number(hour.waterTemperatureC)}°C`,
    `${number(hour.airTemperatureC)}°C`,
    `${number(hour.precipitationMm)} mm`,
    `${number(hour.precipitationProbabilityPct, 0)}%`,
    number(hour.scores.surfing.value, 0),
    number(hour.scores.rockFishing.value, 0),
    number(hour.scores.inshoreFishing.value, 0),
  ];
  return `<tr><th scope="row">${escape(values[0])}</th>${values
    .slice(1)
    .map((value) => `<td>${escape(value)}</td>`)
    .join("")}</tr>`;
};

const updateLocation = (): void => {
  const params = new URLSearchParams({ spot: selected, date: requestedDate });
  history.replaceState(null, "", `?${params}`);
};

const week = new OutlookStrip((date) => {
  requestedDate = date === dateOffset(1) ? "tomorrow" : date;
  element<HTMLInputElement>("date").value = date;
  element("forecast").hidden = true;
  updateLocation();
  void load();
});

currentTomorrow = dateOffset(1);

element("forecast-places").addEventListener("click", (event) => {
  const target =
    event.target instanceof Element ? event.target.closest<HTMLElement>("[data-spot]") : null;
  if (!target?.dataset.spot) return;
  selected = target.dataset.spot;
  week.show(
    spots.find((spot) => spot.id === selected)!,
    activeDate(),
    dateOffset(0),
  );
  updateLocation();
  render();
});
element<HTMLInputElement>("hour").addEventListener("input", (event) => {
  selectedHour = Number((event.target as HTMLInputElement).value);
  renderHour();
});
element("charts").addEventListener("click", (event) => {
  const forecast = forecasts.get(selected);
  if (!forecast) return;
  const hour = chartHour(event, forecast.hours.length);
  if (hour !== null) {
    selectedHour = hour;
    renderHour();
  }
});
element<HTMLInputElement>("date").addEventListener("change", (event) => {
  const value = (event.target as HTMLInputElement).value;
  if (!value) return;
  requestedDate = value === dateOffset(1) ? "tomorrow" : value;
  element("forecast").hidden = true;
  updateLocation();
  void load();
});
element("retry").addEventListener("click", () => {
  void load();
});
element("refresh").addEventListener("click", () => {
  week.clear();
  void load();
});
element("copy-api").addEventListener("click", () => {
  const write =
    navigator.clipboard?.writeText(new URL(endpoint(selected), location.origin).href) ??
    Promise.reject(new Error("Clipboard unavailable"));
  void write
    .then(() => {
      element("copy-api").textContent = "Copied";
      setTimeout(() => {
        element("copy-api").textContent = "Copy URL";
      }, 2000);
    })
    .catch(() => {
      element("status").textContent =
        "Copy is unavailable here. Select the endpoint link to open and copy its URL.";
    });
});
const dateInput = element<HTMLInputElement>("date");
dateInput.min = dateOffset(0);
dateInput.max = dateOffset(6);
dateInput.value = activeDate();
setInterval(() => {
  const tomorrow = dateOffset(1);
  if (tomorrow === currentTomorrow) return;
  currentTomorrow = tomorrow;
  dateInput.min = dateOffset(0);
  dateInput.max = dateOffset(6);
  if (["tomorrow", "today"].includes(requestedDate)) {
    dateInput.value = activeDate();
    void load();
  }
}, 60000);
void load();
new ResizeObserver(() => renderHour()).observe(element("charts"));
