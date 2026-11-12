import type { Answer, NormalizationRules } from "./types.js";

import type { CategoryView } from "../../shared/types.js";

export interface Category extends Omit<CategoryView, "total"> {
  answers: Answer[];
  normalization?: NormalizationRules;
  answerPackVersion?: string;
}
