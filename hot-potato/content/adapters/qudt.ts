import pack from "../../server/answers/data/units.json" with { type: "json" };
import type { Answer } from "../../server/answers/types.js";
import type { SourceSnapshot } from "../../server/answers/catalogue-types.js";

export const qudtSnapshot = (answers: readonly Answer[]): SourceSnapshot => ({
  schemaVersion: 1,
  source: { id: "qudt-units", ...pack.source },
  records: answers.map((answer) => ({ ...answer, id: answer.id!, facts: {} })),
});
