import { readFile } from "node:fs/promises";
import { readCatalogue } from "../server/answers/catalogue-format.js";

import { compileCatalogue, checkCoverage, digest } from "../content/compile.js";
import { compileDataset } from "../content/datasets.js";
import type { CuratedRecord, RecordTag } from "../content/datasets.js";
import { atomicJson, contentRoot, loadSnapshots, readJson } from "../content/io.js";
import { catalogueChanges, publishCatalogue } from "../content/publication.js";
import { baselineCases, requireBenchmark } from "../content/baseline.js";
import type { Answer } from "../server/answers/types.js";
import { withUnitPack } from "../server/answers/units.js";
import { qudtSnapshot } from "../content/adapters/qudt.js";
import type {
  QuestionDefinition,
  CompiledCatalogue,
  Correction,
  CoverageCase,
  FactCorrection,
  DatasetDefinition,
} from "../server/answers/catalogue-types.js";

const rawQuestions = await readJson<QuestionDefinition[]>(new URL("questions.json", contentRoot));
const datasets = await readJson<DatasetDefinition[]>(new URL("datasets.json", contentRoot));
const definitions = rawQuestions.map((question) => {
  const dataset = datasets.find((dataset) => dataset.id === question.datasetId);
  if (!dataset) throw new Error(`Unknown dataset ${question.datasetId} for ${question.id}`);
  return { ...question, normalization: { ...dataset.normalization, ...question.normalization } };
});
const curated = await readJson<CuratedRecord[]>(new URL("curated-records.json", contentRoot));
const tags = await readJson<RecordTag[]>(new URL("record-tags.json", contentRoot));
const legacy = await readJson<Record<string, Answer[]>>(
  new URL("legacy-answers.json", contentRoot),
);
const corrections = await readJson<Correction[]>(new URL("corrections.json", contentRoot));
const fixtures = await readJson<CoverageCase[]>(new URL("fixtures.json", contentRoot));
const factCorrections = await readJson<FactCorrection[]>(
  new URL("fact-corrections.json", contentRoot),
);
requireBenchmark(definitions, fixtures);
const sources = await loadSnapshots();
sources.push(qudtSnapshot(withUnitPack(legacy.units)));
if (new Set(datasets.map((dataset) => dataset.id)).size !== datasets.length)
  throw new Error("Duplicate dataset definition");
const compiledDatasets = datasets.map((dataset) =>
  compileDataset(dataset, sources, curated, legacy, corrections, factCorrections, tags),
);
const { catalogue, reviews } = compileCatalogue(definitions, compiledDatasets);
catalogue.datasets = datasets.map((dataset, index) => ({
  id: dataset.id,
  name: dataset.name,
  description: dataset.description,
  records: compiledDatasets[index].records.length,
  properties: [
    ...new Set(compiledDatasets[index].records.flatMap((record) => Object.keys(record.facts))),
  ].sort(),
  sourceIds: dataset.imports.map((entry) => entry.source),
}));
catalogue.sources = sources.map((source) => source.source).concat(catalogue.sources);
for (const [id, name, url, content] of [
  [
    "project-curation",
    "Reviewed project records and property tags",
    "repo:content/curated-records.json",
    { curated, tags },
  ],
  ["legacy-curation", "Migrated answer names", "repo:content/legacy-answers.json", legacy],
  [
    "reviewed-facts",
    "Reviewed source classifications",
    "repo:content/fact-corrections.json",
    factCorrections,
  ],
  [
    "reviewed-corrections",
    "Reviewed dataset corrections",
    "repo:content/corrections.json",
    corrections,
  ],
] as const) {
  if (!catalogue.packs.some((pack) => pack.sourceIds.includes(id))) continue;
  catalogue.sources = catalogue.sources.filter((source) => source.id !== id);
  catalogue.sources.push({
    id,
    name,
    url,
    revision: digest(content),
    sha256: digest(content),
    license: "LicenseRef-ProjectCuration",
  });
}
catalogue.version = digest({
  sources: catalogue.sources,
  datasets: catalogue.datasets,
  packs: catalogue.packs,
});
const baseline = baselineCases(
  definitions,
  new Map(Object.entries(legacy).filter(([id]) => id !== "units")),
);
const checks = checkCoverage(catalogue.packs, fixtures);
const baselineChecks = checkCoverage(catalogue.packs, baseline);
const output = new URL("../server/answers/data/catalogue.json", contentRoot);
const previous: CompiledCatalogue = process.argv.includes("--bootstrap")
  ? { schemaVersion: 3, version: "bootstrap", sources: [], datasets: [], packs: [] }
  : readCatalogue(JSON.parse(await readFile(output, "utf8")));
const changes = catalogueChanges(previous, catalogue);
if (!process.argv.includes("--check")) {
  await atomicJson(new URL("review.json", contentRoot), {
    version: catalogue.version,
    reviews,
    datasetReviews: compiledDatasets.flatMap((dataset) => dataset.reviews),
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
    `${review.questionId}: ${review.publishedAnswers} answers (${review.legacyOnly.length} legacy-only; ${review.quarantined.length} quarantined)`,
  );
console.log(
  `${checks.length} independent cases and ${baseline.length} existing-answer checks passed. Catalogue ${catalogue.version.slice(0, 12)}. Offline build; no runtime network dependency.`,
);
