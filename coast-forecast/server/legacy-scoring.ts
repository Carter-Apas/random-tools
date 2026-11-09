import { asRecord, boundedNumber } from "../shared/config-validation.js";
import { makeCurve } from "../shared/scoring-config.js";
import { variables, profileActivities } from "../shared/variables.js";
import type { ScoringConfig, VariableId } from "../shared/types.js";

const replace = (
  config: ScoringConfig,
  profile: keyof ScoringConfig,
  variable: VariableId,
  values: [number, number][],
) => {
  const unique = [...new Map(values.map(([x, y]) => [x, y])).entries()].sort((a, b) => a[0] - b[0]);
  const curve = makeCurve(variable, unique);
  config[profile].curves = config[profile].curves.map((item) =>
    item.variable === variable ? curve : item,
  );
};

export const migrateLegacyScoring = (current: ScoringConfig, input: unknown): ScoringConfig => {
  const result = structuredClone(current);
  const profiles = asRecord(input, "Legacy scoring");
  for (const [name, value] of Object.entries(profiles)) {
    if (!profileActivities.includes(name as keyof ScoringConfig))
      throw new Error(`Unknown scoring profile: ${name}`);
    const profile = name as keyof ScoringConfig;
    const fields = asRecord(value, "Legacy thresholds");
    const allowed = [
      "minHeightM",
      "idealMinHeightM",
      "idealMaxHeightM",
      "maxHeightM",
      "goodPeriodS",
      "maxWindKmh",
      "maxGustKmh",
      "maxRainMm",
      "maxWaveHeightM",
      "longPeriodS",
    ];
    for (const key of Object.keys(fields))
      if (!allowed.includes(key)) throw new Error(`Unknown legacy setting: ${key}`);

    const get = (key: string, fallback: number) =>
      fields[key] === undefined ? fallback : boundedNumber(fields[key], 0.1, 150, key);

    const limited: [string, VariableId, number][] = [
      ["maxWindKmh", "windSpeed", profile === "surfing" ? 35 : 25],
      ["maxGustKmh", "windGust", profile === "surfing" ? 50 : 35],
      ["maxRainMm", "rain", profile === "surfing" ? 5 : 3],
    ];
    for (const [key, variable, fallback] of limited) {
      const limit = get(key, fallback);
      if (limit >= variables[variable].max)
        throw new Error(`Legacy ${key} is outside the supported curve range.`);
      replace(result, profile, variable, [
        [0, variable === "windSpeed" ? 30 : 10],
        [limit * 0.5, 5],
        [limit, -100],
        [variables[variable].max, -200],
      ]);
    }
    if (profile === "surfing") {
      const low = get("minHeightM", 0.3),
        idealLow = get("idealMinHeightM", 0.8),
        idealHigh = get("idealMaxHeightM", 1.8),
        high = get("maxHeightM", 3);
      if (!(low < idealLow && idealLow <= idealHigh && idealHigh < high && high < 15))
        throw new Error("Legacy surf-height thresholds are invalid.");
      replace(result, profile, "surfHeight", [
        [0, -150],
        [low, -40],
        [idealLow, 35],
        [idealHigh, 35],
        [high, -100],
        [15, -200],
      ]);
      replace(result, profile, "swellPeriod", [
        [0, -30],
        [4, 0],
        [get("goodPeriodS", 12), 25],
        [30, 25],
      ]);
    } else {
      const limit = get("maxWaveHeightM", profile === "rockFishing" ? 1 : 1.5);
      if (limit >= 15) throw new Error("Legacy wave-height limit must be below 15 m.");
      replace(result, profile, "waveHeight", [
        [0, 45],
        [limit * 0.5, 20],
        [limit, -150],
        [15, -300],
      ]);
      if (profile === "rockFishing")
        replace(result, profile, "swellPeriod", [
          [0, 10],
          [8, 5],
          [get("longPeriodS", 14), -100],
          [30, -200],
        ]);
    }
  }
  return result;
};
