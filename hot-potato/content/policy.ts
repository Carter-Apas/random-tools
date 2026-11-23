import type { QuestionDefinition } from "../server/answers/catalogue-types.js";

export interface QuestionPolicy {
  wholeDatasetAllowed: string[];
  tooBroad: string[];
}

const signature = (question: QuestionDefinition): string =>
  JSON.stringify([
    question.datasetId,
    Object.entries(question.select.where ?? {})
      .map(([property, values]) => [property, [...values].sort()] as const)
      .sort(([a], [b]) => a.localeCompare(b)),
  ]);

export const requireSpecificQuestions = (
  active: QuestionDefinition[],
  retired: QuestionDefinition[],
  policy: QuestionPolicy,
): void => {
  const banned = new Set(policy.tooBroad);
  const bannedSignatures = new Map(
    retired.filter((question) => banned.has(question.id)).map((q) => [signature(q), q.id]),
  );
  const missing = policy.tooBroad.filter((id) => !retired.some((question) => question.id === id));
  if (missing.length) throw new Error(`Too-broad questions missing from archive: ${missing}`);
  const problems = active.flatMap((question) => {
    if (banned.has(question.id)) return [`${question.id}: listed as too broad`];
    const twin = bannedSignatures.get(signature(question));
    if (twin) return [`${question.id}: selects the same records as too-broad "${twin}"`];
    if (
      !Object.keys(question.select.where ?? {}).length &&
      !policy.wholeDatasetAllowed.includes(question.id)
    )
      return [`${question.id}: selects a whole dataset; add a property filter`];
    return [];
  });
  if (problems.length)
    throw new Error(`Questions too broad (see AGENTS.md):\n${problems.join("\n")}`);
};
