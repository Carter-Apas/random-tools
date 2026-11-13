import type { Answer, NormalizationRules } from "./types.js";

import type { QuestionView } from "../../shared/types.js";

export interface Question extends Omit<QuestionView, "total"> {
  answers: Answer[];
  normalization?: NormalizationRules;
  answerPackVersion?: string;
}
