import {
  map as leafletMap,
  tileLayer,
  marker,
  divIcon,
  polyline,
  layerGroup,
  circleMarker,
} from "leaflet";
import type { LatLng, Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

import { element } from "./format";

import { bearingBetween, destination, shoreNormal, wrapBearing } from "../shared/orientation";
import type { Coordinate } from "../shared/orientation";
import type { Spot } from "../shared/types";

const coordinate = (value: LatLng): Coordinate => ({ latitude: value.lat, longitude: value.lng });

const tuple = (value: Coordinate): [number, number] => [value.latitude, value.longitude];

const pin = (kind: string, label: string) =>
  divIcon({
    className: `coast-pin coast-pin-${kind}`,
    html: `<span>${label}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

export const createPlaceMap = (spot: Spot, changed: () => void, fresh: boolean) => {
  const container = element("place-map");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const map = leafletMap(container, {
    center: tuple(spot),
    zoom: fresh ? 8 : 13,
    scrollWheelZoom: false,
    zoomAnimation: !reduced,
    fadeAnimation: !reduced,
  });
  const tiles = tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    referrerPolicy: "strict-origin-when-cross-origin",
    keepBuffer: 1,
  }).addTo(map);
  tiles.on("tileerror", () => {
    element("map-status").textContent =
      "Map tiles could not load. You can still use the coordinate fields and direction controls.";
  });
  tiles.on("tileload", () => {
    element("map-status").textContent = "";
  });
  const placePin = marker(tuple(spot), {
    draggable: true,
    icon: pin("place", "P"),
    title: "Place / weather sample — drag to move",
    alt: "Place / weather sample",
  }).addTo(map);
  const marinePin = marker([spot.marineLatitude, spot.marineLongitude], {
    draggable: true,
    icon: pin("marine", "M"),
    title: "Marine sample — drag into open water",
    alt: "Marine sample",
  }).addTo(map);
  const seaPin = marker(
    tuple(destination(spot, wrapBearing(spot.offshoreFromDegrees + 180), 700)),
    {
      draggable: true,
      icon: pin("sea", "S"),
      title: "Toward sea — drag to rotate shoreline",
      alt: "Sea direction",
    },
  ).addTo(map);
  const lines = layerGroup().addTo(map);
  let mode = fresh ? "place" : "pan";
  let shoreStart: Coordinate | null = null;

  const render = () => {
    lines.clearLayers();
    const offshore = spot.offshoreFromDegrees;
    const sea = destination(spot, offshore + 180, 700);
    polyline(
      [tuple(destination(spot, offshore - 90, 850)), tuple(destination(spot, offshore + 90, 850))],
      { color: "#3f5d6d", weight: 4, interactive: false },
    ).addTo(lines);
    polyline(
      [
        tuple(destination(sea, offshore - 35, 140)),
        tuple(sea),
        tuple(destination(sea, offshore + 35, 140)),
      ],
      { color: "#986000", weight: 4, interactive: false },
    ).addTo(lines);
    polyline([tuple(spot), tuple(sea)], { color: "#986000", weight: 4, interactive: false }).addTo(
      lines,
    );
    polyline([tuple(spot), tuple(destination(spot, offshore, 700))], {
      color: "#006b80",
      weight: 4,
      dashArray: "6 6",
      interactive: false,
    }).addTo(lines);
    if (shoreStart) circleMarker(tuple(shoreStart), { radius: 6, color: "#006b80" }).addTo(lines);
    placePin.setLatLng(tuple(spot));
    marinePin.setLatLng([spot.marineLatitude, spot.marineLongitude]);
    seaPin.setLatLng(tuple(sea));
  };

  const select = (next: string) => {
    mode = next;
    shoreStart = null;
    document
      .querySelectorAll<HTMLButtonElement>("[data-map-mode]")
      .forEach((button) =>
        button.setAttribute("aria-pressed", String(button.dataset.mapMode === mode)),
      );
    const instructions: Record<string, string> = {
      pan: "Pan and zoom to explore. Drag P to move your place, M to move the marine sample, or the gold handle to rotate the shore.",
      place: "Click the beach or fishing spot to place P. Pan and zoom first if needed.",
      marine: "Click open water near the place to set the marine sampling point M.",
      sea: "Click out over the water from P. The gold line points toward sea, perpendicular to the shore.",
      shore:
        "Click two points along the shoreline. We use their direction as an abstract line through P. Flip sea side if needed.",
    };
    element("map-instruction").textContent = instructions[mode];
    container.dataset.mode = mode;
    render();
  };

  const movePlace = (point: Coordinate) => {
    if (Math.abs(point.latitude) > 85) return;
    const delta = {
      latitude: point.latitude - spot.latitude,
      longitude: point.longitude - spot.longitude,
    };
    spot.latitude = point.latitude;
    spot.longitude = wrapBearing(point.longitude + 180) - 180;
    spot.marineLatitude = Math.max(-90, Math.min(90, spot.marineLatitude + delta.latitude));
    spot.marineLongitude = wrapBearing(spot.marineLongitude + delta.longitude + 180) - 180;
  };

  const setSea = (point: Coordinate) => {
    if (map.distance(tuple(spot), tuple(point)) < 5) return;
    spot.offshoreFromDegrees = wrapBearing(Math.round(bearingBetween(spot, point) + 180));
  };

  const clicked = (point: Coordinate) => {
    if (mode === "pan") return;
    if (mode === "place") {
      movePlace(point);
      map.setView(tuple(spot), Math.max(map.getZoom(), 13), { animate: false });
    }
    if (mode === "marine") {
      spot.marineLatitude = point.latitude;
      spot.marineLongitude = wrapBearing(point.longitude + 180) - 180;
    }
    if (mode === "sea") setSea(point);
    if (mode === "shore" && !drawShore(point)) return;
    select("pan");
    changed();
    render();
  };

  const drawShore = (point: Coordinate): boolean => {
    if (!shoreStart) {
      shoreStart = point;
      render();
      element("map-instruction").textContent = "Now click the second point along the shoreline.";
      return false;
    }
    if (map.distance(tuple(shoreStart), tuple(point)) < 5) return false;
    spot.offshoreFromDegrees = wrapBearing(
      Math.round(shoreNormal(bearingBetween(shoreStart, point), spot.offshoreFromDegrees)),
    );
    return true;
  };

  map.on("click", (event) => clicked(coordinate(event.latlng)));
  bindDrag(placePin, movePlace, changed, render);
  bindDrag(
    marinePin,
    (point) => {
      spot.marineLatitude = point.latitude;
      spot.marineLongitude = wrapBearing(point.longitude + 180) - 180;
    },
    changed,
    render,
  );
  bindDrag(seaPin, setSea, changed, render);
  select(mode);
  const resize = new ResizeObserver(() => map.invalidateSize({ animate: false }));
  resize.observe(container);
  return {
    render,
    select,
    center: () => centerMap(map, spot),
    destroy: () => {
      resize.disconnect();
      map.remove();
    },
  };
};

const bindDrag = (
  pin: Marker,
  update: (point: Coordinate) => void,
  changed: () => void,
  render: () => void,
) => {
  pin.on("dragend", () => {
    update(coordinate(pin.getLatLng()));
    changed();
    render();
  });
};

const centerMap = (map: LeafletMap, spot: Spot) => {
  map.setView(tuple(spot), 13, { animate: false });
};
