import { readFile } from "node:fs/promises";

import { compileCatalogue, checkCoverage } from "../content/compile.js";
import { qudtSnapshot } from "../content/adapters/qudt.js";
import { atomicJson, contentRoot, loadSnapshots, readJson } from "../content/io.js";
import { catalogueChanges, publishCatalogue } from "../content/publication.js";
import { baselineCases, requireBenchmark } from "../content/baseline.js";
import { seedCategories } from "../server/answers/seeds.js";
import type {
  CategoryDefinition,
  CompiledCatalogue,
  Correction,
  CoverageCase,
  FactCorrection,
} from "../server/answers/catalogue-types.js";

const definitions = await readJson<CategoryDefinition[]>(new URL("definitions.json", contentRoot));
const corrections = await readJson<Correction[]>(new URL("corrections.json", contentRoot));
const fixtures = await readJson<CoverageCase[]>(new URL("fixtures.json", contentRoot));
const factCorrections = await readJson<FactCorrection[]>(
  new URL("fact-corrections.json", contentRoot),
);
requireBenchmark(definitions, fixtures);
const sources = await loadSnapshots();
sources.push(qudtSnapshot(seedCategories.find((category) => category.id === "units")!.answers));
const seeds = new Map(
  seedCategories
    .filter((category) => category.id !== "units")
    .map((category) => [category.id, category.answers] as const),
);
const { catalogue, reviews } = compileCatalogue(
  definitions,
  sources,
  seeds,
  corrections,
  factCorrections,
);
const baseline = baselineCases(definitions, seeds);
const checks = checkCoverage(catalogue.packs, fixtures);
const baselineChecks = checkCoverage(catalogue.packs, baseline);
const output = new URL("../server/answers/data/catalogue.json", contentRoot);
const previous: CompiledCatalogue = process.argv.includes("--bootstrap")
  ? { schemaVersion: 2, version: "bootstrap", sources: [], packs: [] }
  : (JSON.parse(await readFile(output, "utf8")) as CompiledCatalogue);
const changes = catalogueChanges(previous, catalogue);
if (!process.argv.includes("--check")) {
  await atomicJson(new URL("review.json", contentRoot), {
    version: catalogue.version,
    reviews,
    changes,
    checks,
    baselineChecks,
  });
}
await publishCatalogue(output, previous, catalogue, [...fixtures, ...baseline], {
  checkOnly: process.argv.includes("--check"),
  allowRemovals: process.argv.includes("--allow-removals"),
});
for (const review of reviews)
  console.log(
    `${review.categoryId}: ${review.publishedAnswers} answers (${review.legacyOnly.length} legacy-only; ${review.quarantined.length} quarantined)`,
  );
console.log(
  `${checks.length} independent cases and ${baseline.length} existing-answer checks passed. Catalogue ${catalogue.version.slice(0, 12)}. Offline build; no runtime network dependency.`,
);
