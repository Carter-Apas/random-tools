import { variables } from "./variables.js";
import type { PointCurve, ScoringConfig, VariableId } from "./types.js";

export const makeCurve = (
  variable: VariableId,
  values: [number, number][],
  enabled = true,
): PointCurve => ({
  variable,
  enabled,
  interpolation: "smooth",
  points: values.map(([x, y]) => ({ x, y })),
});

export const directionCurve = (
  variable: "windDirection" | "swellDirection",
  ideal: number,
  maximum: number,
  penalty: number,
): PointCurve => {
  const points = [0, 45, 90, 135, 180, 225, 270, 315, 360].map((x): [number, number] => {
    const distance = Math.abs(((x - ideal + 540) % 360) - 180);
    return [x, Number((maximum + ((penalty - maximum) * distance) / 180).toFixed(1))];
  });
  if (!points.some(([x]) => x === ideal)) points.push([ideal, maximum]);
  return makeCurve(
    variable,
    points.sort((a, b) => a[0] - b[0]),
  );
};

const extras = (curves: PointCurve[]): PointCurve[] => {
  const missing = (Object.keys(variables) as VariableId[]).filter(
    (key) => !curves.some((curve) => curve.variable === key),
  );
  return [
    ...curves,
    ...missing.map((key) =>
      makeCurve(
        key,
        [
          [variables[key].min, 0],
          [variables[key].max, 0],
        ],
        false,
      ),
    ),
  ];
};

export const defaultScoring = (offshore = 90, swellFrom = 240): ScoringConfig => ({
  surfing: {
    curves: extras([
      makeCurve("surfHeight", [
        [0, -150],
        [0.3, -40],
        [0.8, 35],
        [1.8, 35],
        [3, -100],
        [15, -200],
      ]),
      makeCurve("swellHeight", [
        [0, -20],
        [0.5, 10],
        [1.5, 20],
        [3, -50],
        [15, -150],
      ]),
      makeCurve("swellPeriod", [
        [0, -30],
        [5, 0],
        [12, 25],
        [18, 25],
        [30, 0],
      ]),
      makeCurve("windSpeed", [
        [0, 20],
        [8, 18],
        [20, 0],
        [35, -100],
        [100, -200],
      ]),
      directionCurve("windDirection", offshore, 20, -200),
      directionCurve("swellDirection", swellFrom, 20, -100),
      makeCurve("windGust", [
        [0, 10],
        [15, 8],
        [30, 0],
        [50, -100],
        [150, -200],
      ]),
      makeCurve("rain", [
        [0, 5],
        [2, 0],
        [10, -30],
        [50, -100],
      ]),
      {
        ...makeCurve("weatherCode", [
          [0, 5],
          [3, 3],
          [51, 0],
          [80, -10],
          [95, -500],
          [99, -500],
        ]),
        interpolation: "step",
      },
    ]),
  },
  rockFishing: {
    curves: extras([
      makeCurve("waveHeight", [
        [0, 40],
        [0.3, 35],
        [0.6, 15],
        [1, -150],
        [15, -300],
      ]),
      makeCurve("windSpeed", [
        [0, 30],
        [8, 20],
        [15, 0],
        [20, -100],
        [100, -200],
      ]),
      makeCurve("windGust", [
        [0, 20],
        [15, 10],
        [25, -20],
        [30, -100],
        [150, -200],
      ]),
      makeCurve("swellPeriod", [
        [0, 10],
        [8, 8],
        [12, 0],
        [14, -60],
        [20, -120],
        [30, -200],
      ]),
      makeCurve("rain", [
        [0, 10],
        [1, 0],
        [3, -50],
        [50, -150],
      ]),
    ]),
  },
  inshoreFishing: {
    curves: extras([
      makeCurve("waveHeight", [
        [0, 45],
        [0.5, 30],
        [1, 5],
        [1.5, -150],
        [15, -300],
      ]),
      makeCurve("windSpeed", [
        [0, 30],
        [10, 20],
        [20, 0],
        [25, -100],
        [100, -200],
      ]),
      makeCurve("windGust", [
        [0, 20],
        [15, 15],
        [25, 0],
        [35, -100],
        [150, -200],
      ]),
      makeCurve("rain", [
        [0, 5],
        [1, 0],
        [3, -30],
        [50, -150],
      ]),
    ]),
  },
});
