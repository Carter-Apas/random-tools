import { curveMaximum, evaluateCurve } from "./curves.js";
import { variables } from "./variables.js";
import type { ConditionScore, PointProfile, Scenario, Scores, Spot } from "./types.js";

export const scoreLabel = (value: number | null): string => {
  if (value === null) return "Unavailable";
  if (value >= 80) return "Excellent";
  if (value >= 60) return "Good";
  if (value >= 40) return "Fair";
  return "Poor";
};

export const evaluateProfile = (profile: PointProfile, inputs: Scenario): ConditionScore => {
  const factors = profile.curves
    .filter((curve) => curve.enabled)
    .map((curve) => {
      const input = inputs[curve.variable];
      return {
        variable: curve.variable,
        name: variables[curve.variable].label,
        input,
        points: input === null || !Number.isFinite(input) ? null : evaluateCurve(curve, input),
        maxPoints: curveMaximum(curve),
      };
    });
  const maxPoints = factors.reduce((sum, factor) => sum + factor.maxPoints, 0);
  const complete =
    factors.length > 0 && maxPoints > 0 && factors.every((factor) => factor.points !== null);
  const points = complete ? factors.reduce((sum, factor) => sum + factor.points!, 0) : null;
  const value =
    points === null ? null : Math.round(Math.max(0, Math.min(100, (100 * points) / maxPoints)));
  const penalties = factors
    .filter((factor) => factor.points !== null && factor.points < 0)
    .map((factor) => `${factor.name}: ${factor.points!.toFixed(1)} points.`);
  const reason =
    maxPoints <= 0
      ? "Enable curves with a positive combined maximum to calculate a score."
      : "Required input for an enabled curve is missing; no score is calculated.";
  return {
    value,
    label: scoreLabel(value),
    points,
    maxPoints,
    factors,
    reasons: complete
      ? [
          `Earned points divided by ${maxPoints.toFixed(1)} available points, normalized to 0–100.`,
          ...penalties,
        ]
      : [reason],
  };
};

export const simulate = (spot: Pick<Spot, "scoring">, inputs: Scenario): Scores => {
  const surfing = evaluateProfile(spot.scoring.surfing, inputs);
  const rockFishing = evaluateProfile(spot.scoring.rockFishing, inputs);
  const inshoreFishing = evaluateProfile(spot.scoring.inshoreFishing, inputs);
  const lower = lowerScore(rockFishing, inshoreFishing);
  return {
    surfing,
    rockFishing,
    inshoreFishing,
    fishing: combinedScore(lower),
  };
};

const lowerScore = (first: ConditionScore, second: ConditionScore): ConditionScore | null => {
  if (first.value === null || second.value === null) return null;
  return first.value <= second.value ? first : second;
};

const combinedScore = (lower: ConditionScore | null): ConditionScore => ({
  value: lower?.value ?? null,
  label: scoreLabel(lower?.value ?? null),
  points: lower?.points ?? null,
  maxPoints: lower?.maxPoints ?? 0,
  factors: [],
  reasons: ["Combined fishing score is the lower of rock fishing and inshore boat fishing."],
});
