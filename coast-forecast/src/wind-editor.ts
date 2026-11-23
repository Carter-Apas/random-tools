import { comparisonSvg, comparisonLegend } from "./wind-comparison";
import { openCurveEditor } from "./curve-editor";
import { curveSvg, graphView } from "./curve-graph";
import { directionGuide } from "./direction-guide";
import { element, number } from "./format";
import { createWindScene } from "./wind-scene";
import { dialBearing, windDial } from "./wind-dial";

import { boundedNumber, parseProfile, parseWindSurface } from "../shared/config-validation";
import { evaluateProfile } from "../shared/point-scoring";
import { wrapBearing } from "../shared/orientation";
import { defaultWindSurface } from "../shared/wind-defaults";
import {
  compileWindSurface,
  surfaceCurve,
  windFromCurves,
  windMaximum,
} from "../shared/wind-surface";
import type {
  PointCurve,
  PointProfile,
  ProfileActivity,
  Scenario,
  WindSurface,
} from "../shared/types";

interface WindEditorOptions {
  profile: PointProfile;
  activity: ProfileActivity;
  context: string;
  offshore: number;
  inputs: Scenario;
  apply: (surface: WindSurface, inputs: Scenario, mode: "surface" | "independent") => void;
}

export const openWindEditor = (options: WindEditorOptions) => {
  const dialog = element<HTMLDialogElement>("wind-editor");
  const invoker = document.activeElement as HTMLElement | null;
  const abort = new AbortController();
  const events = { signal: abort.signal };
  let surface = structuredClone(options.profile.windSurface ?? windFromCurves(options.profile));
  let direction = wrapBearing(options.inputs.windDirection ?? options.offshore);
  let speed = Math.max(0, Math.min(100, options.inputs.windSpeed ?? 20));
  let editor: ReturnType<typeof openCurveEditor> | undefined;
  const undo: WindSurface[] = [];
  let redo: WindSurface[] = [];
  let batchTimer: ReturnType<typeof setTimeout> | undefined;
  let batch = false;
  element("wind-context").textContent = options.context;
  element("wind-error").textContent = "";
  element("wind-shore-guide").innerHTML = directionGuide(options.offshore);
  dialog.showModal();
  dialog.scrollTop = 0;
  let scene: ReturnType<typeof createWindScene> | undefined;
  try {
    scene = createWindScene(element<HTMLCanvasElement>("wind-scene"), surface);
  } catch (error) {
    element("wind-scene-help").textContent =
      error instanceof Error ? error.message : "3D preview unavailable. Use the slice editor.";
  }

  const inputs = (): Scenario => ({
    ...options.inputs,
    windSpeed: speed,
    windDirection: direction,
  });

  const previewProfile = (): PointProfile => ({
    ...options.profile,
    windSurface: surface,
    windMode: "surface",
  });

  const current = () =>
    surface.slices.find((slice) => Math.abs(slice.direction - direction) < 0.00001);

  const stopBatch = () => {
    clearTimeout(batchTimer);
    batch = false;
  };

  const checkpoint = () => {
    stopBatch();
    undo.push(structuredClone(surface));
    if (undo.length > 60) undo.shift();
    redo = [];
  };

  const fail = (error: unknown) => {
    element("wind-error").textContent =
      error instanceof Error ? error.message : "Check the wind surface.";
  };

  const compare = () => {
    const focused = (document.activeElement as HTMLElement | null)?.dataset.selectWindSlice;
    const root = element("wind-slice-comparison");
    root.innerHTML = comparisonSvg(surface, direction, speed, root.clientWidth);
    element("wind-slice-legend").innerHTML = comparisonLegend(surface, direction);
    if (focused)
      element("wind-slice-legend")
        .querySelector<HTMLButtonElement>(`[data-select-wind-slice="${focused}"]`)
        ?.focus({ preventScroll: true });
  };

  const results = () => {
    const value = compileWindSurface(surface)(speed, direction);
    const score = evaluateProfile(previewProfile(), inputs());
    element("wind-result").innerHTML =
      `<strong>${number(value)} <small>wind pts</small></strong><span>${surface.enabled ? `Activity ${number(score.value, 0)}/100` : "Wind excluded"}</span>`;
    element("wind-maximum").textContent =
      `Wind maximum ${number(windMaximum(surface))} pts, counted once · activity maximum ${number(score.maxPoints)} pts · ${surface.slices.length}/36 direction slices`;
    element<HTMLInputElement>("wind-speed").value = String(speed);
    element<HTMLInputElement>("wind-speed-range").value = String(speed);
    element<HTMLButtonElement>("wind-undo").disabled = !undo.length;
    element<HTMLButtonElement>("wind-redo").disabled = !redo.length;
    scene?.marker(speed, direction);
    compare();
  };

  const changeCurve = (curve: PointCurve) => {
    const slice = current();
    if (!slice || JSON.stringify(slice.curve) === JSON.stringify(curve)) return;
    if (!batch) {
      checkpoint();
      batch = true;
    }
    clearTimeout(batchTimer);
    batchTimer = setTimeout(() => {
      batch = false;
    }, 350);
    slice.curve = structuredClone(curve);
    scene?.update(surface, speed, direction);
    results();
  };

  const mountSlice = () => {
    editor?.destroy();
    editor = undefined;
    const root = element("wind-slice-editor");
    const slice = current();
    root.hidden = !slice;
    element("wind-blend-preview").hidden = !!slice;
    element("wind-slice-title").textContent = `Wind speed from ${number(direction, 0)}°`;
    element("wind-slice-state").textContent = slice
      ? "Edit this slice. Changes update the full surface immediately."
      : "Blended preview. Add a slice here to shape this direction independently.";
    element<HTMLButtonElement>("wind-add-slice").disabled = !!slice || surface.slices.length >= 36;
    element<HTMLButtonElement>("wind-remove-slice").disabled = !slice || surface.slices.length <= 2;
    if (!slice) {
      const curve = surfaceCurve(surface, direction);
      element("wind-blend-preview").innerHTML = curveSvg(curve, graphView(curve), {
        input: speed,
        idPrefix: "wind-blend-",
      });
      return;
    }
    root.innerHTML = element("curve-editor")
      .innerHTML.replace(/id="([^"]+)"/g, 'id="wind-slice-$1"')
      .replace(/for="([^"]+)"/g, 'for="wind-slice-$1"');
    editor = openCurveEditor({
      curve: slice.curve,
      context: `${options.context} · ${number(direction, 0)}°`,
      input: speed,
      embedded: { root, prefix: "wind-slice-" },
      pointLimit: 20000,
      preview: (curve) =>
        evaluateProfile(
          {
            ...options.profile,
            windMode: "surface",
            windSurface: {
              ...surface,
              slices: surface.slices.map((item) =>
                item === current() ? { ...item, curve } : item,
              ),
            },
          },
          inputs(),
        ),
      apply: () => {},
      change: changeCurve,
    });
  };

  const controls = () => {
    element<HTMLInputElement>("wind-enabled").checked = surface.enabled;
    element<HTMLSelectElement>("wind-blending").value = surface.interpolation;
    element<HTMLInputElement>("wind-direction").value = String(Number(direction.toFixed(6)));
    element<HTMLInputElement>("wind-bearing").value = String(direction);
    const dial = element("wind-dial");
    dial.innerHTML = windDial(surface, direction, options.offshore);
    dial.setAttribute("aria-valuenow", String(direction));
    dial.setAttribute("aria-valuetext", `${number(direction, 0)} degrees from`);
    element<HTMLSelectElement>("wind-slices").innerHTML =
      `<option value="">Blended direction</option>${surface.slices.map((slice) => `<option value="${slice.direction}">${number(slice.direction)}°</option>`).join("")}`;
    element<HTMLSelectElement>("wind-slices").value = current() ? String(direction) : "";
    results();
  };

  const refresh = () => {
    controls();
    mountSlice();
    scene?.update(surface, speed, direction);
  };

  const selectDirection = (value: number) => {
    stopBatch();
    direction = wrapBearing(value);
    controls();
    mountSlice();
  };

  const close = () => {
    if (dialog.classList.contains("is-closing")) return;
    dialog.classList.add("is-closing");
    setTimeout(
      () => {
        stopBatch();
        abort.abort();
        editor?.destroy();
        scene?.destroy();
        dialog.close();
        dialog.classList.remove("is-closing");
        if (invoker?.isConnected) invoker.focus();
        else element("variable-list").querySelector<HTMLButtonElement>("[data-open-wind]")?.focus();
      },
      matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 160,
    );
  };

  const apply = (mode: "surface" | "independent") => {
    try {
      const next = parseWindSurface(surface);
      parseProfile({ ...options.profile, windSurface: next, windMode: mode });
      options.apply(next, inputs(), mode);
      close();
    } catch (error) {
      fail(error);
    }
  };

  for (const id of ["close-wind", "cancel-wind"])
    element(id).addEventListener("click", close, events);
  dialog.addEventListener(
    "cancel",
    (event) => {
      event.preventDefault();
      close();
    },
    events,
  );
  element("apply-wind").addEventListener("click", () => apply("surface"), events);
  element("wind-independent").addEventListener("click", () => apply("independent"), events);
  element("wind-default").addEventListener(
    "click",
    () => {
      checkpoint();
      surface = defaultWindSurface(options.offshore, options.activity);
      direction = options.offshore;
      refresh();
    },
    events,
  );
  element("wind-from-curves").addEventListener(
    "click",
    () => {
      checkpoint();
      surface = windFromCurves(options.profile);
      refresh();
    },
    events,
  );
  element("wind-enabled").addEventListener(
    "change",
    () => {
      checkpoint();
      surface.enabled = element<HTMLInputElement>("wind-enabled").checked;
      controls();
    },
    events,
  );
  element("wind-blending").addEventListener(
    "change",
    () => {
      checkpoint();
      surface.interpolation = element<HTMLSelectElement>("wind-blending")
        .value as WindSurface["interpolation"];
      refresh();
    },
    events,
  );
  element("wind-add-slice").addEventListener(
    "click",
    () => {
      if (current() || surface.slices.length >= 36) return;
      checkpoint();
      surface.slices.push({ direction, curve: surfaceCurve(surface, direction) });
      surface.slices.sort((a, b) => a.direction - b.direction);
      refresh();
    },
    events,
  );
  element("wind-remove-slice").addEventListener(
    "click",
    () => {
      if (!current() || surface.slices.length <= 2) return;
      checkpoint();
      surface.slices = surface.slices.filter((slice) => slice !== current());
      refresh();
    },
    events,
  );
  element("wind-slices").addEventListener(
    "change",
    () => {
      const value = element<HTMLSelectElement>("wind-slices").value;
      if (value !== "") selectDirection(Number(value));
    },
    events,
  );
  element("wind-direction").addEventListener(
    "change",
    () => {
      try {
        selectDirection(
          boundedNumber(
            element<HTMLInputElement>("wind-direction").value,
            0,
            359.999999,
            "Direction",
          ),
        );
      } catch (error) {
        fail(error);
      }
    },
    events,
  );
  element("wind-bearing").addEventListener(
    "input",
    () => selectDirection(Number(element<HTMLInputElement>("wind-bearing").value)),
    events,
  );

  const setSpeed = (id: string) => {
    try {
      speed = boundedNumber(element<HTMLInputElement>(id).value, 0, 100, "Wind speed");
      editor?.setInput(speed);
      results();
    } catch (error) {
      fail(error);
    }
  };

  element("wind-speed").addEventListener("input", () => setSpeed("wind-speed"), events);
  element("wind-speed-range").addEventListener("input", () => setSpeed("wind-speed-range"), events);
  element("wind-undo").addEventListener(
    "click",
    () => {
      if (!undo.length) return;
      stopBatch();
      redo.push(structuredClone(surface));
      surface = undo.pop()!;
      refresh();
    },
    events,
  );
  element("wind-redo").addEventListener(
    "click",
    () => {
      if (!redo.length) return;
      stopBatch();
      undo.push(structuredClone(surface));
      surface = redo.pop()!;
      refresh();
    },
    events,
  );
  element("wind-rotate-left").addEventListener("click", () => scene?.rotate(-0.25, 0), events);
  element("wind-rotate-right").addEventListener("click", () => scene?.rotate(0.25, 0), events);
  element("wind-reset-view").addEventListener("click", () => scene?.reset(), events);
  let dialDragging = false;
  const dial = element("wind-dial");
  dial.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      dialDragging = true;
      dial.setPointerCapture(event.pointerId);
      selectDirection(dialBearing(event, dial));
    },
    events,
  );
  dial.addEventListener(
    "pointermove",
    (event) => {
      if (dialDragging) selectDirection(dialBearing(event, dial));
    },
    events,
  );
  for (const event of ["pointerup", "pointercancel"])
    dial.addEventListener(
      event,
      () => {
        dialDragging = false;
      },
      events,
    );
  dial.addEventListener(
    "keydown",
    (event) => {
      const offsets: Record<string, number> = {
        ArrowLeft: -1,
        ArrowDown: -1,
        ArrowRight: 1,
        ArrowUp: 1,
        PageDown: -15,
        PageUp: 15,
      };
      if (offsets[event.key]) {
        event.preventDefault();
        selectDirection(direction + offsets[event.key] * (event.shiftKey ? 10 : 1));
      }
      if (event.key === "Home") {
        event.preventDefault();
        selectDirection(0);
      }
    },
    events,
  );
  element("wind-slice-legend").addEventListener(
    "click",
    (event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-select-wind-slice]")
          : null;
      if (target?.dataset.selectWindSlice) selectDirection(Number(target.dataset.selectWindSlice));
    },
    events,
  );
  const comparisonResize = new ResizeObserver(compare);
  comparisonResize.observe(element("wind-slice-comparison"));
  const comparisonTheme = new MutationObserver(compare);
  comparisonTheme.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-mono-theme"],
  });
  abort.signal.addEventListener(
    "abort",
    () => {
      comparisonResize.disconnect();
      comparisonTheme.disconnect();
    },
    { once: true },
  );
  refresh();
};
