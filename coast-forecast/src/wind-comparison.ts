import { graphView, graphX, graphY } from "./curve-graph";
import { number } from "./format";
import { lightTheme, sliceColor } from "./wind-colors";

import { compileCurve } from "../shared/curves";
import type { PointCurve, WindSurface } from "../shared/types";

export const comparisonSvg = (
  surface: WindSurface,
  selected: number,
  speed: number,
  width: number,
): string => {
  const curve: PointCurve = {
    ...surface.slices[0].curve,
    points: surface.slices.flatMap((slice) => slice.curve.points),
  };
  const view = {
    ...graphView(curve),
    width: Math.max(240, width),
    height: 220,
    left: 48,
    right: 16,
    top: 16,
    bottom: 32,
  };

  const x = (value: number) => graphX(value, curve, view);

  const y = (value: number) => graphY(value, view);

  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((fraction) => {
      const points = view.minY + (view.maxY - view.minY) * fraction;
      return `<line x1="${view.left}" x2="${view.width - view.right}" y1="${y(points)}" y2="${y(points)}" class="curve-grid"/><text x="${view.left - 8}" y="${y(points) + 4}" text-anchor="end">${number(points, 0)}</text><text x="${x(fraction * 100)}" y="${view.height - 10}" text-anchor="middle">${fraction * 100}</text>`;
    })
    .join("");
  const paths = surface.slices
    .map((slice) => {
      const evaluate = compileCurve(slice.curve);
      const samples = [
        ...new Set([
          ...Array.from({ length: 101 }, (_, index) => index),
          ...slice.curve.points.map((point) => point.x),
        ]),
      ].sort((a, b) => a - b);
      const path = samples
        .map((value, index) => `${index ? "L" : "M"}${x(value)},${y(evaluate(value))}`)
        .join(" ");
      const active = Math.abs(slice.direction - selected) < 0.00001;
      const color = sliceColor(slice.direction, lightTheme());
      return `<path data-direction="${slice.direction}" d="${path}" fill="none" stroke="${color}" stroke-width="${active ? 3 : 1.6}" opacity="${active ? 1 : 0.85}"/><circle cx="${x(speed)}" cy="${y(evaluate(speed))}" r="${active ? 4 : 2.5}" fill="${color}"/>`;
    })
    .join("");
  return `<svg class="curve-svg" viewBox="0 0 ${view.width} ${view.height}" role="img" aria-label="All ${surface.slices.length} stored direction slices. Horizontal axis wind speed from 0 to 100 km/h; vertical axis signed points.">${grid}<line x1="${view.left}" x2="${view.width - view.right}" y1="${y(0)}" y2="${y(0)}" class="curve-zero"/><line x1="${x(speed)}" x2="${x(speed)}" y1="${view.top}" y2="${view.height - view.bottom}" class="curve-sim-marker"/>${paths}</svg>`;
};

export const comparisonLegend = (surface: WindSurface, selected: number): string =>
  surface.slices
    .map(
      (slice) =>
        `<button type="button" class="wind-slice-chip" data-select-wind-slice="${slice.direction}" aria-pressed="${Math.abs(slice.direction - selected) < 0.00001}" style="--slice-color:${sliceColor(slice.direction, lightTheme())}"><i aria-hidden="true"></i>${number(slice.direction)}°</button>`,
    )
    .join("");
