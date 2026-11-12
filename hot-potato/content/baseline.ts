import type { Answer } from "../server/answers/types.js";
import type { CategoryDefinition, CoverageCase } from "../server/answers/catalogue-types.js";

export const requireBenchmark = (
  definitions: CategoryDefinition[],
  fixtures: CoverageCase[],
): void => {
  for (const definition of definitions) {
    const cases = fixtures.filter((fixture) => fixture.categoryId === definition.id);
    for (const difficulty of ["common", "obscure", "boundary"]) {
      if (!cases.some((fixture) => fixture.difficulty === difficulty))
        throw new Error(`${definition.id}: missing ${difficulty} benchmark cases`);
    }
  }
};

export const baselineCases = (
  definitions: CategoryDefinition[],
  seeds: Map<string, readonly Answer[]>,
): CoverageCase[] =>
  definitions.flatMap((definition) => {
    const names = new Set(
      (seeds.get(definition.id) ?? []).flatMap((answer) => [answer.label, ...answer.aliases]),
    );
    return [...names].map((answer) => ({
      categoryId: definition.id,
      answer,
      expected: "accepted" as const,
      difficulty: "common" as const,
      evidence: "hot-potato/server/answers/seeds.ts",
    }));
  });
