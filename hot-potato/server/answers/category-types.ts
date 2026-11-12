import type { Answer, NormalizationRules } from "./types.js";

import type { CategoryView } from "../../shared/types.js";

export interface Category extends Omit<CategoryView, "total"> {
  family?: string;
  answers: Answer[];
  normalization?: NormalizationRules;
  answerPackVersion?: string;
}
