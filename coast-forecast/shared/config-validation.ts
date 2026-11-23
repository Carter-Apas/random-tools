import { profileMaximum } from "./wind-surface.js";
import { profileActivities, variables } from "./variables.js";
import type { PointCurve, PointProfile, ScoringConfig, VariableId, WindSurface } from "./types.js";

export const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
};

export const boundedNumber = (value: unknown, min: number, max: number, label: string): number => {
  if (
    !["number", "string"].includes(typeof value) ||
    String(value).trim() === "" ||
    !Number.isFinite(Number(value))
  )
    throw new Error(`${label} must be a number.`);
  const number = Number(value);
  if (number < min || number > max) throw new Error(`${label} must be between ${min} and ${max}.`);
  return number;
};

export const parseCurve = (input: unknown, pointLimit = 10000): PointCurve => {
  const curve = asRecord(input, "Curve");
  if (!Object.hasOwn(variables, String(curve.variable))) throw new Error("Unknown curve variable.");
  if (
    Object.keys(curve).some(
      (key) => !["variable", "enabled", "interpolation", "points"].includes(key),
    )
  )
    throw new Error("Unknown curve property.");
  if (typeof curve.enabled !== "boolean") throw new Error("Curve enabled must be true or false.");
  if (!["linear", "smooth", "step"].includes(String(curve.interpolation)))
    throw new Error("Choose linear, smooth or step interpolation.");
  if (!Array.isArray(curve.points) || curve.points.length < 2 || curve.points.length > 256)
    throw new Error("Each curve needs between 2 and 256 control points.");
  const variable = curve.variable as VariableId;
  const definition = variables[variable];
  const points = curve.points.map((value) => {
    const point = asRecord(value, "Control point");
    return {
      x: boundedNumber(point.x, definition.min, definition.max, `${variable} input`),
      y: boundedNumber(point.y, -pointLimit, pointLimit, "Points"),
    };
  });
  validatePoints(variable, points);
  return {
    variable,
    enabled: curve.enabled,
    interpolation: curve.interpolation as PointCurve["interpolation"],
    points,
  };
};

export const parseProfile = (input: unknown): PointProfile => {
  const profile = asRecord(input, "Activity profile");
  if (
    Object.keys(profile).some((key) => !["curves", "windSurface", "windMode"].includes(key)) ||
    !Array.isArray(profile.curves) ||
    profile.curves.length > Object.keys(variables).length
  )
    throw new Error("An activity must contain a curves array with at most one curve per variable.");
  const curves = profile.curves.map((curve) => parseCurve(curve));
  if (new Set(curves.map((curve) => curve.variable)).size !== curves.length)
    throw new Error("Each variable can have only one curve per activity.");
  const result: PointProfile = { curves };
  if (Object.hasOwn(profile, "windSurface"))
    result.windSurface = parseWindSurface(profile.windSurface);
  if (Object.hasOwn(profile, "windMode"))
    result.windMode = parseWindMode(profile.windMode, result.windSurface);
  if (profileMaximum(result) <= 0)
    throw new Error("Each activity needs a positive sum of enabled curve/surface maxima.");
  return result;
};

export const mergePointScoring = (current: ScoringConfig, input: unknown): ScoringConfig => {
  const result = structuredClone(current);
  for (const [profile, value] of Object.entries(asRecord(input, "Scoring"))) {
    if (!profileActivities.includes(profile as (typeof profileActivities)[number]))
      throw new Error(`Unknown scoring profile: ${profile}`);
    result[profile as (typeof profileActivities)[number]] = parseProfile(value);
  }
  return result;
};

const validatePoints = (variable: VariableId, points: { x: number; y: number }[]) => {
  const definition = variables[variable];
  if (points.some((point, index) => index > 0 && point.x <= points[index - 1].x))
    throw new Error("Control-point inputs must be unique and sorted from left to right.");
  if (
    definition.circular &&
    (points[0].x !== 0 || points.at(-1)!.x !== 360 || points[0].y !== points.at(-1)!.y)
  )
    throw new Error("Direction curves must join at 0° and 360° with the same points value.");
};

export const parseWindSurface = (input: unknown): WindSurface => {
  const surface = asRecord(input, "Wind surface");
  if (Object.keys(surface).some((key) => !["enabled", "interpolation", "slices"].includes(key)))
    throw new Error("Unknown wind surface property.");
  if (typeof surface.enabled !== "boolean")
    throw new Error("Wind surface enabled must be true or false.");
  if (!["linear", "smooth", "step"].includes(String(surface.interpolation)))
    throw new Error("Choose linear, smooth or step direction blending.");
  if (!Array.isArray(surface.slices) || surface.slices.length < 2 || surface.slices.length > 36)
    throw new Error("A wind surface needs between 2 and 36 direction slices.");
  const slices = surface.slices.map((input) => {
    const slice = asRecord(input, "Direction slice");
    if (Object.keys(slice).some((key) => !["direction", "curve"].includes(key)))
      throw new Error("Unknown direction slice property.");
    const curve = parseCurve(slice.curve, 20000);
    if (curve.variable !== "windSpeed" || !curve.enabled)
      throw new Error("Each slice must be an enabled wind-speed curve.");
    return { direction: boundedNumber(slice.direction, 0, 359.999999, "Slice direction"), curve };
  });
  if (slices.some((slice, index) => index > 0 && slice.direction <= slices[index - 1].direction))
    throw new Error(
      "Direction slices must have unique bearings sorted from 0 to less than 360 degrees.",
    );
  return {
    enabled: surface.enabled,
    interpolation: surface.interpolation as WindSurface["interpolation"],
    slices,
  };
};

const parseWindMode = (input: unknown, surface?: WindSurface): "surface" | "independent" => {
  if (input !== "surface" && input !== "independent")
    throw new Error("Choose surface or independent wind scoring.");
  if (input === "surface" && !surface)
    throw new Error("Surface wind scoring requires a windSurface.");
  return input;
};
