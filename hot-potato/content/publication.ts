import { atomicJson } from "./io.js";
import { checkCoverage } from "./compile.js";

import type { CompiledCatalogue, CoverageCase } from "../server/answers/catalogue-types.js";

export const catalogueChanges = (previous: CompiledCatalogue, next: CompiledCatalogue) =>
  [...new Set([...previous.packs, ...next.packs].map((pack) => pack.categoryId))].map(
    (categoryId) => {
      const old = previous.packs.find((item) => item.categoryId === categoryId);
      const pack = next.packs.find((item) => item.categoryId === categoryId);
      const oldIds = new Set(old?.answers.map((answer) => answer.id) ?? []);
      const newIds = new Set(pack?.answers.map((answer) => answer.id) ?? []);
      return {
        categoryId,
        previous: oldIds.size,
        current: newIds.size,
        added: [...newIds].filter((id) => !oldIds.has(id)).length,
        removed: [...oldIds].filter((id) => !newIds.has(id)).length,
      };
    },
  );

export const publishCatalogue = async (
  output: URL,
  previous: CompiledCatalogue,
  catalogue: CompiledCatalogue,
  cases: CoverageCase[],
  options: { checkOnly?: boolean; allowRemovals?: boolean } = {},
): Promise<void> => {
  const failed = checkCoverage(catalogue.packs, cases).filter((fixture) => !fixture.passed);
  if (failed.length)
    throw new Error(
      `Coverage checks failed: ${failed.map((fixture) => `${fixture.categoryId}: ${fixture.answer}`).join(", ")}. See content/review.json; published packs unchanged.`,
    );
  const largeChanges = catalogueChanges(previous, catalogue).filter(
    (change) => change.previous > 0 && change.removed > change.previous * 0.1,
  );
  if (largeChanges.length && !options.allowRemovals)
    throw new Error(
      `Large removals in ${largeChanges.map((change) => change.categoryId).join(", ")}; review before passing --allow-removals.`,
    );
  if (options.checkOnly) {
    if (catalogue.version !== previous.version)
      throw new Error("Published catalogue is stale; run npm run answers:build");
  } else await atomicJson(output, catalogue);
};
