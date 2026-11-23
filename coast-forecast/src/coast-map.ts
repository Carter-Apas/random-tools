import { map as leafletMap, tileLayer, polyline, circleMarker, layerGroup } from "leaflet";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

import { element, escape, hourLabel, number } from "./format";

import { incomingFlow } from "../shared/direction-flow";
import { destination, wrapBearing } from "../shared/orientation";
import type { Coordinate } from "../shared/orientation";
import type { ForecastHour, Spot, Swell } from "../shared/types";

const tuple = (point: Coordinate): [number, number] => [point.latitude, point.longitude];

const nearby = (origin: Coordinate, point: Coordinate): [number, number] => [
  point.latitude,
  origin.longitude + wrapBearing(point.longitude - origin.longitude + 180) - 180,
];

const colors = { wind: "#986000", primary: "#006b96", secondary: "#75479b", shore: "#435c69" };

const bearingText = (degrees: number | null, label: string | null): string =>
  degrees === null ? "Direction unavailable" : `From ${escape(label ?? "")} ${number(degrees, 0)}°`;

const swellReadout = (swell: Swell): string =>
  `${number(swell.heightM)} m · ${number(swell.periodS)}s<span>${bearingText(swell.directionDeg, swell.direction)}</span>`;

const readout = (kind: string, label: string, value: string): string =>
  `<div class="coast-readout coast-readout-${kind}"><dt><i aria-hidden="true"></i>${label}</dt><dd>${value}</dd></div>`;

export const createCoastMap = () => {
  const container = element("coast-map");
  let current: { spot: Spot; hour: ForecastHour } | undefined;
  let map: LeafletMap | undefined;
  let layers: LayerGroup | undefined;
  let location = "";

  const draw = () => {
    if (!map || !layers || !current) return;
    const { spot, hour } = current;
    const key = `${spot.id}:${spot.latitude}:${spot.longitude}:${spot.offshoreFromDegrees}`;
    if (location !== key) {
      map.fitBounds(
        [nearby(spot, destination(spot, 315, 2500)), nearby(spot, destination(spot, 135, 2500))],
        { padding: [20, 20], maxZoom: 14, animate: false },
      );
      location = key;
    }
    layers.clearLayers();
    polyline(
      [
        nearby(spot, destination(spot, spot.offshoreFromDegrees - 90, 1400)),
        nearby(spot, destination(spot, spot.offshoreFromDegrees + 90, 1400)),
      ],
      { color: colors.shore, weight: 3, dashArray: "6 5", interactive: false },
    ).addTo(layers);
    drawFlow(layers, spot, hour.secondarySwell.directionDeg, 1500, colors.secondary, true);
    drawFlow(layers, spot, hour.primarySwell.directionDeg, 1100, colors.primary);
    drawFlow(layers, spot, hour.wind.fromDeg, 700, colors.wind);
    circleMarker(tuple(spot), {
      radius: 5,
      color: "#fff",
      weight: 2,
      fillColor: "#263c4b",
      fillOpacity: 1,
      interactive: false,
    }).addTo(layers);
    container.setAttribute(
      "aria-label",
      `${spot.name} at ${hourLabel(hour.localTime)}. Wind and swell arrows point from their source toward the place. Dashed line is the saved shoreline orientation.`,
    );
  };

  const initialize = () => {
    if (map || !current) return;
    map = leafletMap(container, {
      center: tuple(current.spot),
      zoom: 13,
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: false,
      keyboard: false,
      doubleClickZoom: false,
      boxZoom: false,
      touchZoom: false,
      zoomAnimation: false,
      fadeAnimation: false,
      attributionControl: true,
    });
    const tiles = tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      referrerPolicy: "strict-origin-when-cross-origin",
      keepBuffer: 0,
    }).addTo(map);
    tiles.on("tileerror", () => {
      element("coast-map-status").textContent =
        "Base map unavailable. Forecast arrows and the saved shoreline reference are still shown.";
    });
    tiles.on("tileload", () => {
      element("coast-map-status").textContent = "";
    });
    layers = layerGroup().addTo(map);
    draw();
  };

  const visible = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) initialize();
    },
    { rootMargin: "200px" },
  );
  visible.observe(container);
  const resize = new ResizeObserver(() => map?.invalidateSize({ animate: false }));
  resize.observe(container);
  return {
    update: (spot: Spot, hour: ForecastHour) => {
      current = { spot, hour };
      element("coast-hour").textContent = hourLabel(hour.localTime);
      element("coast-location").textContent = spot.name;
      element("coast-directions-values").innerHTML = [
        readout(
          "wind",
          "Wind",
          `${number(hour.wind.speedKmh, 0)} km/h<span>${number(hour.wind.gustKmh, 0)} km/h gusts · ${bearingText(hour.wind.fromDeg, hour.wind.from)} · ${escape(hour.wind.relative ?? "orientation unavailable")}</span>`,
        ),
        readout("primary", "Primary swell", swellReadout(hour.primarySwell)),
        readout("secondary", "Secondary swell", swellReadout(hour.secondarySwell)),
      ].join("");
      element("coast-shore-note").textContent =
        `Dashed line: shoreline reference. Offshore wind comes from ${number(spot.offshoreFromDegrees, 0)}°. Arrows point toward the place from their forecast FROM bearing.`;
      draw();
    },
    destroy: () => {
      visible.disconnect();
      resize.disconnect();
      map?.remove();
    },
  };
};

const drawFlow = (
  layers: LayerGroup,
  spot: Spot,
  bearing: number | null,
  length: number,
  color: string,
  dashed = false,
) => {
  if (bearing === null || !Number.isFinite(bearing)) return;
  const flow = incomingFlow(spot, bearing, length);
  polyline([nearby(spot, flow.source), nearby(spot, flow.tip)], {
    color,
    weight: 3,
    opacity: 0.95,
    dashArray: dashed ? "5 5" : undefined,
    interactive: false,
  }).addTo(layers);
  polyline([nearby(spot, flow.wings[0]), nearby(spot, flow.tip), nearby(spot, flow.wings[1])], {
    color,
    weight: 3,
    interactive: false,
  }).addTo(layers);
  circleMarker(nearby(spot, flow.source), {
    radius: 3,
    color,
    fillOpacity: 1,
    weight: 1,
    interactive: false,
  }).addTo(layers);
};
