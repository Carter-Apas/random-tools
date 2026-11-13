import { readFileSync } from "node:fs";

import { readCatalogue } from "./catalogue-format.js";

export { readCatalogue } from "./catalogue-format.js";
export const publishedCatalogue = readCatalogue(
  JSON.parse(readFileSync(new URL("./data/catalogue.json", import.meta.url), "utf8")),
);
export const publishedPacks = new Map(
  publishedCatalogue.packs.map((pack) => [pack.questionId, pack]),
);
