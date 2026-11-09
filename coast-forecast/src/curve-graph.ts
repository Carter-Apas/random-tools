import { escape, number } from "./format";

import { directionReferences } from "../shared/orientation";
import { compileCurve } from "../shared/curves";
import { variables } from "../shared/variables";
import type { PointCurve } from "../shared/types";

export interface GraphView {
  width: number;
  height: number;
  minY: number;
  maxY: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const graphView = (curve: PointCurve, mini = false): GraphView => {
  const values = curve.points.map((point) => point.y);
  const min = Math.min(0, ...values),
    max = Math.max(10, ...values);
  const margin = Math.max(5, (max - min) * 0.12);
  return {
    width: mini ? 164 : 900,
    height: mini ? 58 : 360,
    minY: min - margin,
    maxY: max + margin,
    left: mini ? 4 : 58,
    right: mini ? 4 : 24,
    top: mini ? 4 : 24,
    bottom: mini ? 4 : 40,
  };
};

export const graphX = (value: number, curve: PointCurve, view: GraphView): number => {
  const definition = variables[curve.variable];
  return (
    view.left +
    ((value - definition.min) / (definition.max - definition.min)) *
      (view.width - view.left - view.right)
  );
};

export const graphY = (value: number, view: GraphView): number =>
  view.height -
  view.bottom -
  ((value - view.minY) / (view.maxY - view.minY)) * (view.height - view.top - view.bottom);

export const curveSvg = (
  curve: PointCurve,
  view: GraphView,
  options: { mini?: boolean; selected?: number; input?: number | null; offshore?: number } = {},
): string => {
  const definition = variables[curve.variable];
  const evaluate = compileCurve(curve);
  const count = options.mini ? 65 : 361;
  const path = Array.from({ length: count }, (_, index) => {
    const value = definition.min + ((definition.max - definition.min) * index) / (count - 1);
    return `${index ? "L" : "M"}${graphX(value, curve, view)},${graphY(evaluate(value), view)}`;
  }).join(" ");
  const zero = graphY(0, view);
  const grid = options.mini
    ? ""
    : [0, 0.25, 0.5, 0.75, 1]
        .map((fraction) => {
          const value = view.minY + (view.maxY - view.minY) * fraction;
          const y = graphY(value, view);
          const input = definition.min + (definition.max - definition.min) * fraction;
          const x = graphX(input, curve, view);
          return `<line x1="${view.left}" x2="${view.width - view.right}" y1="${y}" y2="${y}" class="curve-grid"/><text x="${view.left - 10}" y="${y + 4}" text-anchor="end">${number(value, 0)}</text><text x="${x}" y="${view.height - 12}" text-anchor="middle">${number(input)}${definition.circular ? "°" : ""}</text>`;
        })
        .join("");
  const points = options.mini
    ? ""
    : curve.points
        .map(
          (point, index) =>
            `<circle data-point="${index}" cx="${graphX(point.x, curve, view)}" cy="${graphY(point.y, view)}" r="${index === options.selected ? 7 : 5}" class="curve-knot${index === options.selected ? " is-selected" : ""}" role="button" tabindex="0" aria-label="Point ${index + 1}: ${number(point.x)} ${escape(definition.unit)}, ${number(point.y)} points"/>`,
        )
        .join("");
  const input = options.input;
  const marker =
    input === undefined || input === null
      ? ""
      : `<line x1="${graphX(input, curve, view)}" x2="${graphX(input, curve, view)}" y1="${view.top}" y2="${view.height - view.bottom}" class="curve-sim-marker"/><circle cx="${graphX(input, curve, view)}" cy="${graphY(evaluate(input), view)}" r="5" class="curve-sim-dot"/>`;
  const negativeId = options.mini ? `negative-${curve.variable}` : "editor-negative";
  return `<svg viewBox="0 0 ${view.width} ${view.height}" class="${options.mini ? "curve-mini" : "curve-svg"}" ${options.mini ? 'aria-hidden="true"' : `role="group" aria-label="${escape(definition.label)} points curve. Drag control points, double-click to add, or use the numeric controls."`}><defs><clipPath id="${negativeId}"><rect x="0" y="${zero}" width="${view.width}" height="${view.height}"/></clipPath></defs>${grid}${referenceLines(curve, view, options.offshore)}<line x1="${view.left}" x2="${view.width - view.right}" y1="${zero}" y2="${zero}" class="curve-zero"/><path d="${path}" class="curve-path"/><path d="${path}" class="curve-path curve-negative" clip-path="url(#${negativeId})"/>${marker}${points}</svg>`;
};

const referenceLines = (curve: PointCurve, view: GraphView, offshore?: number): string => {
  if (!variables[curve.variable].circular || offshore === undefined) return "";
  return directionReferences(offshore)
    .map((reference) => {
      const x = graphX(reference.bearing, curve, view);
      return `<rect x="${x - 4}" y="${view.top}" width="8" height="${view.height - view.top - view.bottom}" class="curve-reference-band band-${reference.kind}"/><line x1="${x}" x2="${x}" y1="${view.top}" y2="${view.height - view.bottom}" class="curve-reference reference-${reference.kind}"><title>${reference.label}: ${number(reference.bearing, 0)}°</title></line>`;
    })
    .join("");
};
