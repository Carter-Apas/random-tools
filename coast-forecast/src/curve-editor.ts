import { curveSvg, graphView } from "./curve-graph";
import { directionGuide } from "./direction-guide";
import { element, number } from "./format";

import { drawCurveSection } from "../shared/curve-editing";
import { curveMaximum } from "../shared/curves";
import { parseCurve } from "../shared/config-validation";
import { variables } from "../shared/variables";
import type { ConditionScore, PointCurve, CurvePoint } from "../shared/types";

interface EditorOptions {
  curve: PointCurve;
  context: string;
  offshore?: number;
  input: number | null;
  preview: (curve: PointCurve) => ConditionScore;
  apply: (curve: PointCurve) => void;
}

export const openCurveEditor = (options: EditorOptions): void => {
  const dialog = element<HTMLDialogElement>("curve-editor");
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
  const canvas = element("curve-canvas");
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
    element<HTMLSelectElement>("curve-interpolation").value = curve.interpolation;
    element<HTMLInputElement>("curve-enabled").checked = curve.enabled;
    element<HTMLInputElement>("point-x").disabled =
      !!variables[curve.variable].circular && [0, curve.points.length - 1].includes(selected);
    canvas.innerHTML = curveSvg(curve, view, {
      selected,
      input: options.input,
      offshore: options.offshore,
    });
    const point = curve.points[selected];
    element<HTMLInputElement>("point-x").value = String(point.x);
    element<HTMLInputElement>("point-y").value = String(point.y);
    element<HTMLInputElement>("curve-y-min").value = String(Number(view.minY.toFixed(1)));
    element<HTMLInputElement>("curve-y-max").value = String(Number(view.maxY.toFixed(1)));
    element<HTMLSelectElement>("point-index").innerHTML = curve.points
      .map((_, index) => `<option value="${index}">Point ${index + 1}</option>`)
      .join("");
    element<HTMLSelectElement>("point-index").value = String(selected);
    element<HTMLButtonElement>("undo-curve").disabled = !undo.length;
    element<HTMLButtonElement>("redo-curve").disabled = !redo.length;
    element<HTMLButtonElement>("delete-point").disabled =
      curve.points.length <= 2 ||
      (!!variables[curve.variable].circular && [0, curve.points.length - 1].includes(selected));
    const score = options.preview(curve);
    const factor = score.factors.find((item) => item.variable === curve.variable);
    element("curve-result").textContent =
      `${number(factor?.points)} pts at ${number(options.input)} ${variables[curve.variable].unit} · activity ${number(score.value, 0)}/100`;
    element("curve-maximum").textContent =
      `Maximum ${number(curveMaximum(curve))} pts · ${curve.points.length} control points`;
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
        -10000,
        Math.min(
          10000,
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
        dialog.close();
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
    element("curve-error").textContent =
      error instanceof Error ? error.message : "Check the control points.";
  };

  const remove = () => {
    if (element<HTMLButtonElement>("delete-point").disabled) return;
    checkpoint();
    curve.points.splice(selected, 1);
    selected = Math.min(selected, curve.points.length - 1);
    render();
  };

  const guide = element("curve-direction-guide");
  guide.hidden = !variables[curve.variable].circular || options.offshore === undefined;
  guide.innerHTML = options.offshore === undefined ? "" : directionGuide(options.offshore);
  element("curve-title").textContent = variables[curve.variable].label;
  element("curve-context").textContent = options.context;
  element("curve-note").textContent = variables[curve.variable].note;
  element("curve-error").textContent = "";
  element<HTMLInputElement>("curve-enabled").checked = curve.enabled;
  element("curve-enabled").addEventListener(
    "change",
    () => {
      checkpoint();
      curve.enabled = element<HTMLInputElement>("curve-enabled").checked;
      render();
    },
    events,
  );
  element<HTMLSelectElement>("curve-interpolation").value = curve.interpolation;
  element<HTMLSelectElement>("curve-mode").value = mode;
  element<HTMLInputElement>("point-x").min = String(variables[curve.variable].min);
  element<HTMLInputElement>("point-x").max = String(variables[curve.variable].max);
  element<HTMLInputElement>("point-x").step = "any";

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
          curve = drawCurveSection(strokeBase!, stroke);
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
  element("add-point").addEventListener(
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
  element("delete-point").addEventListener("click", remove, events);
  element("point-index").addEventListener(
    "change",
    () => {
      selected = Number(element<HTMLSelectElement>("point-index").value);
      render();
    },
    events,
  );
  for (const id of ["point-x", "point-y"])
    element(id).addEventListener(
      "change",
      () => {
        checkpoint();
        move({
          x: Number(element<HTMLInputElement>("point-x").value),
          y: Number(element<HTMLInputElement>("point-y").value),
        });
        render();
      },
      events,
    );
  element("curve-mode").addEventListener(
    "change",
    () => {
      mode = element<HTMLSelectElement>("curve-mode").value;
      canvas.dataset.mode = mode;
    },
    events,
  );
  element("curve-interpolation").addEventListener(
    "change",
    () => {
      checkpoint();
      curve.interpolation = element<HTMLSelectElement>("curve-interpolation")
        .value as PointCurve["interpolation"];
      render();
    },
    events,
  );
  element("fit-curve").addEventListener(
    "click",
    () => {
      view = graphView(curve);
      render();
    },
    events,
  );
  for (const id of ["curve-y-min", "curve-y-max"])
    element(id).addEventListener(
      "change",
      () => {
        const min = Number(element<HTMLInputElement>("curve-y-min").value),
          max = Number(element<HTMLInputElement>("curve-y-max").value);
        if (min < max) view = { ...view, minY: min, maxY: max };
        render();
      },
      events,
    );
  element("undo-curve").addEventListener(
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
  element("redo-curve").addEventListener(
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
  element("cancel-curve").addEventListener("click", close, events);
  element("close-curve").addEventListener("click", close, events);
  element("apply-curve").addEventListener(
    "click",
    () => {
      try {
        options.apply(parseCurve(curve));
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
  dialog.showModal();
  const resize = new ResizeObserver(() => {
    view = { ...view, width: canvas.clientWidth, height: canvas.clientHeight };
    render();
  });
  resize.observe(canvas);
  abort.signal.addEventListener("abort", () => resize.disconnect(), { once: true });
  view = { ...view, width: canvas.clientWidth, height: canvas.clientHeight };
  render();
};
