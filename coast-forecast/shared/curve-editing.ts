import { variables } from "./variables.js";
import type { CurvePoint, PointCurve } from "./types.js";

export const drawCurveSection = (base: PointCurve, stroke: CurvePoint[]): PointCurve => {
  const definition = variables[base.variable];
  const samples = [
    ...new Map(
      stroke.map((point) => [
        Number(Math.max(definition.min, Math.min(definition.max, point.x)).toFixed(3)),
        Number(Math.max(-10000, Math.min(10000, point.y)).toFixed(2)),
      ]),
    ).entries(),
  ].sort((a, b) => a[0] - b[0]);
  if (samples.length < 2) return structuredClone(base);
  const start = samples[0][0],
    end = samples.at(-1)![0];
  const outside = base.points.filter((point) => point.x < start || point.x > end);
  const count = Math.min(80, samples.length, 256 - outside.length);
  if (count < 2)
    throw new Error(
      "This curve already has 256 points. Delete a point before drawing more detail.",
    );
  const drawn = Array.from({ length: count }, (_, index) => {
    const [x, y] = samples[Math.round((index * (samples.length - 1)) / (count - 1))];
    return { x, y };
  });
  const points = [...structuredClone(outside), ...drawn].sort((a, b) => a.x - b.x);
  if (definition.circular) {
    if (end === 360 && start !== 0) points[0].y = points.at(-1)!.y;
    else points.at(-1)!.y = points[0].y;
  }
  return { ...base, points };
};
