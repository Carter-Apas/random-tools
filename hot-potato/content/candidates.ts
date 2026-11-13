import { normalize } from "../server/answers/normalize.js";
import type { Correction } from "../server/answers/catalogue-types.js";

export interface MissingAnswer {
  datasetId: string;
  answer: string;
  evidence: string;
  reason: string;
  id?: string;
  facts?: Record<string, string[]>;
}

const validateFacts = (facts: Record<string, string[]> | undefined): void => {
  if (facts === undefined) return;
  if (!facts || Array.isArray(facts) || typeof facts !== "object")
    throw new Error("Provide a property object");
  if (
    Object.entries(facts).some(
      ([key, values]) =>
        !key.trim() ||
        !Array.isArray(values) ||
        !values.length ||
        values.some((value) => typeof value !== "string" || !value.trim()),
    )
  )
    throw new Error("Provide nonempty string arrays for dataset properties");
};

export const proposeAnswer = (input: MissingAnswer, datasetIds: Set<string>): Correction => {
  if (!datasetIds.has(input.datasetId)) throw new Error("Unknown dataset");
  if (!input.answer.trim() || input.answer.length > 100 || !normalize(input.answer))
    throw new Error("Provide an answer of 1–100 characters");
  const evidence = new URL(input.evidence);
  if (evidence.protocol !== "https:" || evidence.username || evidence.password)
    throw new Error("Provide a public HTTPS evidence URL");
  if (!input.reason.trim()) throw new Error("Explain why the answer belongs to the dataset");
  validateFacts(input.facts);
  return {
    datasetId: input.datasetId,
    status: "pending",
    answer: {
      id: input.id ?? `review:${input.datasetId}:${normalize(input.answer)}`,
      label: input.answer.trim(),
      aliases: [],
      facts: input.facts,
    },
    evidence: evidence.href,
    reason: input.reason.trim(),
  };
};
