import { normalize } from "../server/answers/normalize.js";
import type { Correction } from "../server/answers/catalogue-types.js";

export interface MissingAnswer {
  categoryId: string;
  answer: string;
  evidence: string;
  reason: string;
  id?: string;
}

export const proposeAnswer = (input: MissingAnswer, categoryIds: Set<string>): Correction => {
  if (!categoryIds.has(input.categoryId)) throw new Error("Unknown category");
  if (!input.answer.trim() || input.answer.length > 100 || !normalize(input.answer))
    throw new Error("Provide an answer of 1–100 characters");
  const evidence = new URL(input.evidence);
  if (evidence.protocol !== "https:" || evidence.username || evidence.password)
    throw new Error("Provide a public HTTPS evidence URL");
  if (!input.reason.trim()) throw new Error("Explain why the answer belongs to the category");
  return {
    categoryId: input.categoryId,
    status: "pending",
    answer: {
      id: input.id ?? `review:${input.categoryId}:${normalize(input.answer)}`,
      label: input.answer.trim(),
      aliases: [],
    },
    evidence: evidence.href,
    reason: input.reason.trim(),
  };
};
