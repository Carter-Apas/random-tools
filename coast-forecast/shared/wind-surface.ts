import { compileCurve, curveMaximum, evaluateCurve } from "./curves.js";
import { wrapBearing } from "./orientation.js";
import type { CurvePoint, PointCurve, PointProfile, WindSurface } from "./types.js";

export const independentCurves = (profile: PointProfile): PointCurve[] =>
  profile.curves.filter(
    (curve) =>
      !usesWindSurface(profile) || !["windSpeed", "windDirection"].includes(curve.variable),
  );

export const usesWindSurface = (profile: PointProfile): boolean =>
  profile.windMode === undefined ? !!profile.windSurface : profile.windMode === "surface";

export const setWindMode = (
  profile: PointProfile,
  mode: "surface" | "independent",
): PointProfile => {
  const next = { ...profile, windMode: mode };
  if (mode === "surface" && !next.windSurface) next.windSurface = windFromCurves(profile);
  return next;
};

export const windMaximum = (surface: WindSurface): number =>
  Math.max(...surface.slices.map((slice) => curveMaximum(slice.curve)));

export const maximumWind = (surface: WindSurface) => {
  const maximum = windMaximum(surface);
  const slice = surface.slices.find((item) => curveMaximum(item.curve) === maximum)!;
  return {
    windSpeed: slice.curve.points.find((point) => point.y === maximum)!.x,
    windDirection: slice.direction,
  };
};

export const compileWindSurface = (
  surface: WindSurface,
): ((speed: number, direction: number) => number) => {
  const slices = surface.slices.map((slice) => ({
    direction: slice.direction,
    evaluate: compileCurve(slice.curve),
  }));
  return (speed, direction) => {
    const points = slices.map((slice) => ({ x: slice.direction, y: slice.evaluate(speed) }));
    const extended = [
      ...points.slice(-2).map((point) => ({ x: point.x - 360, y: point.y })),
      ...points,
      ...points.slice(0, 2).map((point) => ({ x: point.x + 360, y: point.y })),
    ];
    return compileCurve({
      variable: "windDirection",
      enabled: true,
      interpolation: surface.interpolation,
      points: extended,
    })(wrapBearing(direction));
  };
};

export const surfaceCurve = (surface: WindSurface, direction: number): PointCurve => {
  const evaluate = compileWindSurface(surface);
  const xs = new Set([0, 5, 10, 15, 20, 30, 40, 50, 75, 100]);
  for (let speed = 0; speed <= 100; speed += 2) xs.add(speed);
  return {
    variable: "windSpeed",
    enabled: true,
    interpolation: "linear",
    points: [...xs]
      .sort((a, b) => a - b)
      .map((x) => ({ x, y: Number(evaluate(x, direction).toFixed(6)) })),
  };
};

export const windFromCurves = (profile: PointProfile): WindSurface => {
  const speed = profile.curves.find((curve) => curve.variable === "windSpeed" && curve.enabled);
  const direction = profile.curves.find(
    (curve) => curve.variable === "windDirection" && curve.enabled,
  );
  const bearings = directionBearings(direction);
  const values: CurvePoint[] = speed?.points ?? [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ];
  return {
    enabled: !!speed || !!direction,
    interpolation: direction?.interpolation ?? "linear",
    slices: bearings.map((bearing) => ({
      direction: bearing,
      curve: {
        variable: "windSpeed",
        enabled: true,
        interpolation: speed?.interpolation ?? "linear",
        points: values.map((point) => ({
          x: point.x,
          y: point.y + (direction ? evaluateCurve(direction, bearing) : 0),
        })),
      },
    })),
  };
};

export const profileMaximum = (profile: PointProfile): number =>
  independentCurves(profile)
    .filter((curve) => curve.enabled)
    .reduce((sum, curve) => sum + curveMaximum(curve), 0) +
  (usesWindSurface(profile) && profile.windSurface?.enabled ? windMaximum(profile.windSurface) : 0);

const directionBearings = (direction?: PointCurve): number[] => {
  const allBearings = direction
    ? direction.points.filter((point) => point.x < 360).map((point) => point.x)
    : [0, 180];
  const bearings = allBearings.filter(
    (_, index) => index % Math.max(1, Math.ceil(allBearings.length / 32)) === 0,
  );
  if (direction) {
    for (const value of [
      Math.max(...direction.points.map((point) => point.y)),
      Math.min(...direction.points.map((point) => point.y)),
    ]) {
      const bearing = wrapBearing(direction.points.find((point) => point.y === value)!.x);
      if (!bearings.includes(bearing)) bearings.push(bearing);
    }
  }
  if (bearings.length < 2) bearings.push(wrapBearing(bearings[0] + 180));
  return bearings.sort((a, b) => a - b);
};
