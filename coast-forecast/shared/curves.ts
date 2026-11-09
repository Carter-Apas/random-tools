import { variables } from "./variables.js";
import type { CurvePoint, PointCurve } from "./types.js";

const tangents = (points: CurvePoint[]): number[] => {
  const deltas = points
    .slice(1)
    .map((point, index) => (point.y - points[index].y) / (point.x - points[index].x));
  const slopes = points.map((_, index) => {
    if (index === 0) return deltas[0];
    if (index === points.length - 1) return deltas[index - 1];
    const a = deltas[index - 1];
    const b = deltas[index];
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  });
  deltas.forEach((delta, index) => {
    if (delta === 0) {
      slopes[index] = 0;
      slopes[index + 1] = 0;
      return;
    }
    const distance = Math.hypot(slopes[index] / delta, slopes[index + 1] / delta);
    if (distance > 3) {
      slopes[index] *= 3 / distance;
      slopes[index + 1] *= 3 / distance;
    }
  });
  return slopes;
};

export const curveMaximum = (curve: PointCurve): number =>
  Math.max(...curve.points.map((point) => point.y));

export const compileCurve = (curve: PointCurve): ((input: number) => number) => {
  const points = curve.points;
  const slopes = tangents(points);
  return (input) => {
    const x = variables[curve.variable].circular ? ((input % 360) + 360) % 360 : input;
    if (x <= points[0].x) return points[0].y;
    if (x >= points[points.length - 1].x) return points[points.length - 1].y;
    const index = points.findIndex((point, i) => i > 0 && x < point.x) - 1;
    const a = points[index];
    const b = points[index + 1];
    const distance = b.x - a.x;
    const t = (x - a.x) / distance;
    if (curve.interpolation === "step") return a.y;
    if (curve.interpolation === "linear") return a.y + (b.y - a.y) * t;
    const squared = t * t;
    const cubed = squared * t;
    return (
      (2 * cubed - 3 * squared + 1) * a.y +
      (cubed - 2 * squared + t) * distance * slopes[index] +
      (-2 * cubed + 3 * squared) * b.y +
      (cubed - squared) * distance * slopes[index + 1]
    );
  };
};

export const evaluateCurve = (curve: PointCurve, input: number): number =>
  compileCurve(curve)(input);
