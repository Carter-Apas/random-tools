import { curveSvg, graphView } from "./curve-graph";
import { directionGuide } from "./direction-guide";
import { element, number } from "./format";

import { drawCurveSection } from "../shared/curve-editing";
import { curveMaximum } from "../shared/curves";
import { parseCurve } from "../shared/config-validation";
import { variables } from "../shared/variables";
import type { ConditionScore, PointCurve, CurvePoint } from "../shared/types";

export interface EditorOptions {
  curve: PointCurve;
  embedded?: { root: HTMLElement; prefix: string };
  pointLimit?: number;
  change?: (curve: PointCurve) => void;
  context: string;
  offshore?: number;
  input: number | null;
  preview: (curve: PointCurve) => ConditionScore;
  apply: (curve: PointCurve) => void;
}

export const openCurveEditor = (options: EditorOptions) => {
  const { prefix, dialog, pointLimit } = editorEnvironment(options);

  const control = <T extends HTMLElement>(id: string): T => element<T>(`${prefix}${id}`);

  const invoker = document.activeElement as HTMLElement | null;
  let curve = structuredClone(options.curve);
  let selected = 0;
  let view = graphView(curve);
  let mode = "move";
  let dragging = false;
  let stroke: CurvePoint[] | null = null;
  let strokeBase: PointCurve | null = null;
  const undo: PointCurve[] = [];
  let redo: PointCurve[] = [];
  const canvas = control("curve-canvas");
  const abort = new AbortController();
  const events = { signal: abort.signal };

  const checkpoint = () => {
    undo.push(structuredClone(curve));
    if (undo.length > 100) undo.shift();
    redo = [];
  };

  const synchronize = (index: number) => {
    if (!variables[curve.variable].circular) return;
    if (index === 0) curve.points.at(-1)!.y = curve.points[0].y;
    if (index === curve.points.length - 1) curve.points[0].y = curve.points.at(-1)!.y;
  };

  const render = () => {
    control<HTMLSelectElement>("curve-interpolation").value = curve.interpolation;
    control<HTMLInputElement>("curve-enabled").checked = curve.enabled;
    control<HTMLInputElement>("point-x").disabled =
      !!variables[curve.variable].circular && [0, curve.points.length - 1].includes(selected);
    canvas.innerHTML = curveSvg(curve, view, {
      selected,
      input: options.input,
      offshore: options.offshore,
      idPrefix: prefix,
    });
    const point = curve.points[selected];
    control<HTMLInputElement>("point-x").value = String(point.x);
    control<HTMLInputElement>("point-y").value = String(point.y);
    control<HTMLInputElement>("curve-y-min").value = String(Number(view.minY.toFixed(1)));
    control<HTMLInputElement>("curve-y-max").value = String(Number(view.maxY.toFixed(1)));
    control<HTMLSelectElement>("point-index").innerHTML = curve.points
      .map((_, index) => `<option value="${index}">Point ${index + 1}</option>`)
      .join("");
    control<HTMLSelectElement>("point-index").value = String(selected);
    control<HTMLButtonElement>("undo-curve").disabled = !undo.length;
    control<HTMLButtonElement>("redo-curve").disabled = !redo.length;
    control<HTMLButtonElement>("delete-point").disabled =
      curve.points.length <= 2 ||
      (!!variables[curve.variable].circular && [0, curve.points.length - 1].includes(selected));
    const score = options.preview(curve);
    const factor = score.factors.find(
      (item) => item.variable === curve.variable || (options.embedded && item.variable === "wind"),
    );
    control("curve-result").textContent =
      `${number(factor?.points)} pts at ${number(options.input)} ${variables[curve.variable].unit} · activity ${number(score.value, 0)}/100`;
    control("curve-maximum").textContent =
      `Maximum ${number(curveMaximum(curve))} pts · ${curve.points.length} control points`;
    options.change?.(structuredClone(curve));
  };

  const pointAt = (event: PointerEvent | MouseEvent): CurvePoint => {
    const bounds = canvas.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * view.width;
    const y = ((event.clientY - bounds.top) / bounds.height) * view.height;
    const definition = variables[curve.variable];
    return {
      x: Math.max(
        definition.min,
        Math.min(
          definition.max,
          definition.min +
            ((x - view.left) / (view.width - view.left - view.right)) *
              (definition.max - definition.min),
        ),
      ),
      y: Math.max(
        -pointLimit,
        Math.min(
          pointLimit,
          view.maxY -
            ((y - view.top) / (view.height - view.top - view.bottom)) * (view.maxY - view.minY),
        ),
      ),
    };
  };

  const move = (point: CurvePoint) => {
    const definition = variables[curve.variable];
    const cyclicEnd = definition.circular && [0, curve.points.length - 1].includes(selected);
    const gap = Math.max(0.001, (definition.max - definition.min) / 100000);
    curve.points[selected] = {
      x: cyclicEnd
        ? curve.points[selected].x
        : Math.max(
            (curve.points[selected - 1]?.x ?? definition.min - gap) + gap,
            Math.min((curve.points[selected + 1]?.x ?? definition.max + gap) - gap, point.x),
          ),
      y: Number(point.y.toFixed(2)),
    };
    curve.points[selected].x = Number(curve.points[selected].x.toFixed(3));
    synchronize(selected);
  };

  const add = (point: CurvePoint) => {
    if (
      curve.points.length >= 256 ||
      curve.points.some((item) => Math.abs(item.x - point.x) < 0.002)
    )
      return;
    checkpoint();
    curve.points.push({ x: Number(point.x.toFixed(3)), y: Number(point.y.toFixed(2)) });
    curve.points.sort((a, b) => a.x - b.x);
    selected = curve.points.findIndex((item) => item.x === Number(point.x.toFixed(3)));
    render();
  };

  const close = () => {
    if (dialog.classList.contains("is-closing")) return;
    dialog.classList.add("is-closing");
    setTimeout(
      () => {
        abort.abort();
        if (!options.embedded) (dialog as HTMLDialogElement).close();
        dialog.classList.remove("is-closing");
        if (invoker?.isConnected) invoker.focus();
        else
          document
            .querySelector<HTMLButtonElement>(`.variable-open[data-open-curve="${curve.variable}"]`)
            ?.focus();
      },
      matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 160,
    );
  };

  const fail = (error: unknown) => {
    control("curve-error").textContent =
      error instanceof Error ? error.message : "Check the control points.";
  };

  const remove = () => {
    if (control<HTMLButtonElement>("delete-point").disabled) return;
    checkpoint();
    curve.points.splice(selected, 1);
    selected = Math.min(selected, curve.points.length - 1);
    render();
  };

  const guide = control("curve-direction-guide");
  guide.hidden = !variables[curve.variable].circular || options.offshore === undefined;
  guide.innerHTML = options.offshore === undefined ? "" : directionGuide(options.offshore);
  control("curve-title").textContent = variables[curve.variable].label;
  control("curve-context").textContent = options.context;
  control("curve-note").textContent = variables[curve.variable].note;
  control("curve-error").textContent = "";
  control<HTMLInputElement>("curve-enabled").checked = curve.enabled;
  control("curve-enabled").addEventListener(
    "change",
    () => {
      checkpoint();
      curve.enabled = control<HTMLInputElement>("curve-enabled").checked;
      render();
    },
    events,
  );
  control<HTMLSelectElement>("curve-interpolation").value = curve.interpolation;
  control<HTMLSelectElement>("curve-mode").value = mode;
  control<HTMLInputElement>("point-x").min = String(variables[curve.variable].min);
  control<HTMLInputElement>("point-x").max = String(variables[curve.variable].max);
  control<HTMLInputElement>("point-x").step = "any";
  control<HTMLInputElement>("point-y").min = String(-pointLimit);
  control<HTMLInputElement>("point-y").max = String(pointLimit);

  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      checkpoint();
      dragging = true;
      canvas.setPointerCapture(event.pointerId);
      const target =
        event.target instanceof Element ? event.target.closest<SVGElement>("[data-point]") : null;
      if (mode === "draw") {
        stroke = [pointAt(event)];
        strokeBase = structuredClone(curve);
      } else if (target) selected = Number(target.dataset.point);
      else {
        dragging = false;
        return;
      }
      render();
    },
    events,
  );
  canvas.addEventListener(
    "pointermove",
    (event) => {
      if (!dragging) return;
      const point = pointAt(event);
      if (stroke) {
        stroke.push(point);
        try {
          curve = drawCurveSection(strokeBase!, stroke, pointLimit);
          selected = 0;
        } catch (error) {
          fail(error);
        }
      } else move(point);
      render();
    },
    events,
  );
  canvas.addEventListener(
    "pointerup",
    () => {
      dragging = false;
      stroke = null;
    },
    events,
  );
  canvas.addEventListener(
    "pointercancel",
    () => {
      dragging = false;
      stroke = null;
    },
    events,
  );
  canvas.addEventListener(
    "dblclick",
    (event) => {
      if (mode === "move") add(pointAt(event));
    },
    events,
  );
  canvas.addEventListener(
    "keydown",
    (event) => {
      const target =
        event.target instanceof Element ? event.target.closest<SVGElement>("[data-point]") : null;
      if (!target) return;
      selected = Number(target.dataset.point);
      if (["Delete", "Backspace"].includes(event.key)) {
        event.preventDefault();
        remove();
        return;
      }
      const directions: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, 1],
        ArrowDown: [0, -1],
      };
      const direction = directions[event.key];
      if (!direction) return;
      event.preventDefault();
      checkpoint();
      const point = { ...curve.points[selected] };
      const step = event.shiftKey ? 10 : 1;
      point.x += direction[0] * variables[curve.variable].step * step;
      point.y += direction[1] * step;
      move(point);
      render();
      canvas.querySelector<SVGElement>(`[data-point="${selected}"]`)?.focus();
    },
    events,
  );
  control("add-point").addEventListener(
    "click",
    () => {
      const gaps = curve.points
        .slice(1)
        .map((point, index) => ({ index, gap: point.x - curve.points[index].x }))
        .sort((a, b) => b.gap - a.gap);
      const a = curve.points[gaps[0].index],
        b = curve.points[gaps[0].index + 1];
      add({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    },
    events,
  );
  control("delete-point").addEventListener("click", remove, events);
  control("point-index").addEventListener(
    "change",
    () => {
      selected = Number(control<HTMLSelectElement>("point-index").value);
      render();
    },
    events,
  );
  for (const id of ["point-x", "point-y"])
    control(id).addEventListener(
      "change",
      () => {
        checkpoint();
        move({
          x: Number(control<HTMLInputElement>("point-x").value),
          y: Number(control<HTMLInputElement>("point-y").value),
        });
        render();
      },
      events,
    );
  control("curve-mode").addEventListener(
    "change",
    () => {
      mode = control<HTMLSelectElement>("curve-mode").value;
      canvas.dataset.mode = mode;
    },
    events,
  );
  control("curve-interpolation").addEventListener(
    "change",
    () => {
      checkpoint();
      curve.interpolation = control<HTMLSelectElement>("curve-interpolation")
        .value as PointCurve["interpolation"];
      render();
    },
    events,
  );
  control("fit-curve").addEventListener(
    "click",
    () => {
      view = graphView(curve);
      render();
    },
    events,
  );
  for (const id of ["curve-y-min", "curve-y-max"])
    control(id).addEventListener(
      "change",
      () => {
        const min = Number(control<HTMLInputElement>("curve-y-min").value),
          max = Number(control<HTMLInputElement>("curve-y-max").value);
        if (min < max) view = { ...view, minY: min, maxY: max };
        render();
      },
      events,
    );
  control("undo-curve").addEventListener(
    "click",
    () => {
      if (!undo.length) return;
      redo.push(structuredClone(curve));
      curve = undo.pop()!;
      selected = 0;
      render();
    },
    events,
  );
  control("redo-curve").addEventListener(
    "click",
    () => {
      if (!redo.length) return;
      undo.push(structuredClone(curve));
      curve = redo.pop()!;
      selected = 0;
      render();
    },
    events,
  );
  control("cancel-curve").addEventListener("click", close, events);
  control("close-curve").addEventListener("click", close, events);
  control("apply-curve").addEventListener(
    "click",
    () => {
      try {
        options.apply(parseCurve(curve, pointLimit));
        close();
      } catch (error) {
        fail(error);
      }
    },
    events,
  );
  dialog.addEventListener(
    "cancel",
    (event) => {
      event.preventDefault();
      close();
    },
    events,
  );
  dialog.addEventListener(
    "click",
    (event) => {
      if (event.target === dialog) {
        const bounds = dialog.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          close();
      }
    },
    events,
  );
  canvas.dataset.mode = mode;
  render();
  if (!options.embedded) (dialog as HTMLDialogElement).showModal();
  const resize = new ResizeObserver(() => {
    view = { ...view, width: canvas.clientWidth, height: canvas.clientHeight };
    render();
  });
  resize.observe(canvas);
  abort.signal.addEventListener("abort", () => resize.disconnect(), { once: true });
  view = { ...view, width: canvas.clientWidth, height: canvas.clientHeight };
  render();
  return {
    destroy: () => abort.abort(),
    setInput: (value: number | null) => {
      options.input = value;
      render();
    },
  };
};

const editorEnvironment = (options: EditorOptions) => ({
  prefix: options.embedded?.prefix ?? "",
  dialog: options.embedded?.root ?? element<HTMLDialogElement>("curve-editor"),
  pointLimit: options.pointLimit ?? 10000,
});
