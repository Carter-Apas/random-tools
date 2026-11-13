import type { Answer } from "../server/answers/types.js";
import type { QuestionDefinition, CoverageCase } from "../server/answers/catalogue-types.js";

export const requireBenchmark = (
  definitions: QuestionDefinition[],
  fixtures: CoverageCase[],
): void => {
  for (const definition of definitions) {
    const cases = fixtures.filter((fixture) => fixture.questionId === definition.id);
    for (const difficulty of ["common", "obscure", "boundary"]) {
      if (!cases.some((fixture) => fixture.difficulty === difficulty))
        throw new Error(`${definition.id}: missing ${difficulty} benchmark cases`);
    }
  }
};

export const baselineCases = (
  definitions: QuestionDefinition[],
  seeds: Map<string, readonly Answer[]>,
): CoverageCase[] =>
  definitions.flatMap((definition) => {
    const names = new Set(
      (seeds.get(definition.id) ?? []).flatMap((answer) => [answer.label, ...answer.aliases]),
    );
    return [...names].map((answer) => ({
      questionId: definition.id,
      answer,
      expected: "accepted" as const,
      difficulty: "common" as const,
      evidence: "repo:content/legacy-answers.json",
    }));
  });
