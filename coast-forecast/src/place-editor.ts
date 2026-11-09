import { directionGuide } from "./direction-guide";
import { element } from "./format";
import { createPlaceMap } from "./place-map";

import { boundedNumber } from "../shared/config-validation";
import { destination, wrapBearing } from "../shared/orientation";
import { defaultScoring } from "../shared/scoring-config";
import type { Spot } from "../shared/types";

interface PlaceEditorOptions {
  spot: Spot;
  fresh: boolean;
  canRemove: boolean;
  apply: (spot: Spot) => void;
  remove: () => void;
}

export const openPlaceEditor = (options: PlaceEditorOptions) => {
  const spot = structuredClone(options.spot);
  const dialog = element<HTMLDialogElement>("place-editor");
  const invoker = document.activeElement as HTMLElement | null;
  const abort = new AbortController();
  const events = { signal: abort.signal };
  element("place-title").textContent = options.fresh ? "Map a new place." : spot.name;
  element<HTMLInputElement>("place-name").value = options.fresh ? "" : spot.name;
  element<HTMLInputElement>("place-coast").value = spot.coast;
  element("remove-place").hidden = options.fresh || !options.canRemove;
  element("place-error").textContent = "";
  element("map-status").textContent = "";
  element("apply-place").textContent = options.fresh ? "Add place to draft" : "Use this place";
  dialog.showModal();
  dialog.scrollTop = 0;

  const render = () => {
    const fields: Record<string, number> = {
      "place-latitude": spot.latitude,
      "place-longitude": spot.longitude,
      "marine-latitude": spot.marineLatitude,
      "marine-longitude": spot.marineLongitude,
      "map-offshore": spot.offshoreFromDegrees,
    };
    for (const [id, value] of Object.entries(fields))
      element<HTMLInputElement>(id).value = String(Number(value.toFixed(6)));
    element("map-orientation").innerHTML = directionGuide(spot.offshoreFromDegrees);
  };

  const map = createPlaceMap(spot, render, options.fresh);
  render();

  const close = () => {
    if (dialog.classList.contains("is-closing")) return;
    dialog.classList.add("is-closing");
    setTimeout(
      () => {
        abort.abort();
        map.destroy();
        dialog.close();
        dialog.classList.remove("is-closing");
        if (invoker?.isConnected) invoker.focus();
        else element("edit-place").focus();
      },
      matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 160,
    );
  };

  const fail = (error: unknown) => {
    element("place-error").textContent =
      error instanceof Error ? error.message : "Check the place settings.";
  };

  const refresh = () => {
    render();
    map.render();
  };

  const readCoordinates = () => {
    try {
      const next = {
        latitude: boundedNumber(
          element<HTMLInputElement>("place-latitude").value,
          -85,
          85,
          "Place latitude",
        ),
        longitude: boundedNumber(
          element<HTMLInputElement>("place-longitude").value,
          -180,
          180,
          "Place longitude",
        ),
        marineLatitude: boundedNumber(
          element<HTMLInputElement>("marine-latitude").value,
          -90,
          90,
          "Marine latitude",
        ),
        marineLongitude: boundedNumber(
          element<HTMLInputElement>("marine-longitude").value,
          -180,
          180,
          "Marine longitude",
        ),
        offshoreFromDegrees: boundedNumber(
          element<HTMLInputElement>("map-offshore").value,
          0,
          359,
          "Offshore bearing",
        ),
      };
      Object.assign(spot, next);
      element("place-error").textContent = "";
      refresh();
      return true;
    } catch (error) {
      fail(error);
      return false;
    }
  };

  for (const id of [
    "place-latitude",
    "place-longitude",
    "marine-latitude",
    "marine-longitude",
    "map-offshore",
  ])
    element(id).addEventListener("change", readCoordinates, events);
  document.querySelectorAll<HTMLButtonElement>("[data-map-mode]").forEach((button) => {
    button.addEventListener(
      "click",
      () =>
        map.select(
          button.getAttribute("aria-pressed") === "true" ? "pan" : button.dataset.mapMode!,
        ),
      events,
    );
  });
  element("map-center").addEventListener("click", map.center, events);
  element("flip-sea").addEventListener(
    "click",
    () => {
      spot.offshoreFromDegrees = wrapBearing(spot.offshoreFromDegrees + 180);
      refresh();
    },
    events,
  );
  element("auto-marine").addEventListener(
    "click",
    () => {
      const point = destination(spot, spot.offshoreFromDegrees + 180, 2000);
      spot.marineLatitude = point.latitude;
      spot.marineLongitude = point.longitude;
      refresh();
    },
    events,
  );
  for (const id of ["close-place", "cancel-place"])
    element(id).addEventListener("click", close, events);
  dialog.addEventListener(
    "cancel",
    (event) => {
      event.preventDefault();
      close();
    },
    events,
  );
  element("apply-place").addEventListener(
    "click",
    () => {
      if (!readCoordinates()) return;
      const name = element<HTMLInputElement>("place-name");
      const coast = element<HTMLInputElement>("place-coast");
      if (!name.reportValidity() || !coast.reportValidity()) return;
      if (!name.value.trim() || !coast.value.trim()) {
        fail(new Error("Give the place a name and region."));
        return;
      }
      spot.name = name.value.trim();
      spot.coast = coast.value.trim();
      if (options.fresh)
        spot.scoring = defaultScoring(
          spot.offshoreFromDegrees,
          wrapBearing(spot.offshoreFromDegrees + 180),
        );
      options.apply(spot);
      close();
    },
    events,
  );
  element("remove-place").addEventListener(
    "click",
    () => {
      options.remove();
      close();
    },
    events,
  );
};
