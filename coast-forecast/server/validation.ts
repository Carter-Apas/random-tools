import { migrateLegacyScoring } from "./legacy-scoring.js";

import { asRecord, mergePointScoring } from "../shared/config-validation.js";
import type { ScoringConfig } from "../shared/types.js";

export { asRecord, boundedNumber } from "../shared/config-validation.js";

export const mergeScoring = (current: ScoringConfig, input: unknown): ScoringConfig => {
  const profiles = asRecord(input, "Scoring");
  const legacy = Object.values(profiles).some(
    (value) => !Object.hasOwn(asRecord(value, "Profile"), "curves"),
  );
  return legacy
    ? mergePointScoring(current, migrateLegacyScoring(current, input))
    : mergePointScoring(current, input);
};
