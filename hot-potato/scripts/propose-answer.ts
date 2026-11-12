import { appendFile } from "node:fs/promises";

import { proposeAnswer } from "../content/candidates.js";
import { contentRoot, readJson } from "../content/io.js";
import type { CategoryDefinition } from "../server/answers/catalogue-types.js";

const args = process.argv.slice(2);
const option = (name: string): string => {
  const index = args.indexOf(`--${name}`);
  return index < 0 ? "" : (args[index + 1] ?? "");
};
const definitions = await readJson<CategoryDefinition[]>(new URL("definitions.json", contentRoot));
const candidate = proposeAnswer(
  {
    categoryId: option("category"),
    answer: option("answer"),
    evidence: option("evidence"),
    reason: option("reason"),
    id: option("id") || undefined,
  },
  new Set(definitions.map((definition) => definition.id)),
);
await appendFile(new URL("candidates.local.jsonl", contentRoot), JSON.stringify(candidate) + "\n");
console.log(
  "Queued for review in content/candidates.local.jsonl. To publish, verify the evidence, set status to approved, and add it to content/corrections.json before rebuilding.",
);
