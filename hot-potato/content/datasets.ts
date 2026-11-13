import { digest, mergeSeeds, applyCorrections } from "./compile.js";
import { correctFacts } from "./facts.js";
import type { PackReview } from "./compile.js";

import type { Answer } from "../server/answers/types.js";
import type {
  CatalogueRecord,
  ContentSource,
  Correction,
  DatasetDefinition,
  FactCorrection,
  SourceSnapshot,
} from "../server/answers/catalogue-types.js";

export interface CuratedRecord extends CatalogueRecord {
  datasetId: string;
}

export interface RecordTag {
  datasetId: string;
  recordId: string;
  facts: Record<string, string[]>;
  aliases?: string[];
  evidence?: string;
}

export interface DatasetSnapshot extends SourceSnapshot {
  reviews: (PackReview & { sourceId: string })[];
}

const unique = (values: string[]): string[] => [...new Set(values)];

const mergeFacts = (target: CatalogueRecord, facts: CatalogueRecord["facts"]): void => {
  for (const [key, values] of Object.entries(facts))
    target.facts[key] = unique([...(target.facts[key] ?? []), ...values]);
};

const joinRecord = (
  records: Map<string, CatalogueRecord>,
  record: CatalogueRecord,
  preferLabel = false,
): void => {
  const existing = records.get(record.id);
  if (!existing) {
    records.set(record.id, structuredClone(record));
    return;
  }
  existing.aliases = unique([...existing.aliases, existing.label, record.label, ...record.aliases]);
  if (preferLabel) existing.label = record.label;
  existing.symbols = unique([...(existing.symbols ?? []), ...(record.symbols ?? [])]);
  existing.evidence = [...(existing.evidence ?? []), ...(record.evidence ?? [])];
  mergeFacts(existing, record.facts);
};

const importRecord = (
  records: Map<string, CatalogueRecord>,
  record: CatalogueRecord,
  entry: DatasetDefinition["imports"][number],
  source: ContentSource,
): void => {
  const facts = { ...record.facts, ...entry.facts };
  const evidence = { sourceId: source.id, url: record.source ?? source.url };
  if (entry.mode === "enrich") {
    const existing = records.get(record.id);
    if (!existing) return;
    mergeFacts(existing, facts);
    existing.evidence = [...(existing.evidence ?? []), evidence];
    return;
  }
  joinRecord(records, { ...record, facts, evidence: [...(record.evidence ?? []), evidence] });
};

const readImport = (
  datasetId: string,
  entry: DatasetDefinition["imports"][number],
  snapshots: SourceSnapshot[],
  legacy: Record<string, Answer[]>,
  factCorrections: FactCorrection[],
) => {
  const raw = snapshots.find((snapshot) => snapshot.source.id === entry.source);
  if (!raw) throw new Error(`Missing dataset source ${entry.source}`);
  const snapshot = correctFacts(raw, factCorrections);
  const review: PackReview = {
    questionId: datasetId,
    sourceRecords: snapshot.records.length,
    publishedAnswers: 0,
    legacyOnly: [],
    quarantined: [],
    ambiguousNames: [],
  };
  const imported = mergeSeeds(
    structuredClone(snapshot.records),
    legacy[entry.legacyKey ?? ""] ?? [],
    review,
  );
  review.publishedAnswers = imported.length;
  return { imported, source: snapshot.source, review: { ...review, sourceId: entry.source } };
};

const applyTags = (records: CatalogueRecord[], tags: RecordTag[]): void => {
  const byId = new Map(records.map((record) => [record.id, record]));
  for (const tag of tags) {
    const record = byId.get(tag.recordId);
    if (!record) throw new Error(`Unknown tagged identity ${tag.recordId} in ${tag.datasetId}`);
    mergeFacts(record, tag.facts);
    record.aliases = unique([...record.aliases, ...(tag.aliases ?? [])]);
    if (tag.evidence && !tag.evidence.startsWith("https://"))
      throw new Error("Tag evidence must use HTTPS");
    record.evidence = [
      ...(record.evidence ?? []),
      { sourceId: "project-curation", url: tag.evidence ?? "repo:content/record-tags.json" },
    ];
  }
};

export const compileDataset = (
  definition: DatasetDefinition,
  snapshots: SourceSnapshot[],
  curated: CuratedRecord[],
  legacy: Record<string, Answer[]>,
  corrections: Correction[],
  factCorrections: FactCorrection[],
  tags: RecordTag[] = [],
): DatasetSnapshot => {
  const records = new Map<string, CatalogueRecord>();
  const reviews: DatasetSnapshot["reviews"] = [];
  for (const entry of definition.imports) {
    const result = readImport(definition.id, entry, snapshots, legacy, factCorrections);
    reviews.push(result.review);
    for (const answer of result.imported)
      importRecord(records, answer as CatalogueRecord, entry, result.source);
  }
  for (const { datasetId, ...record } of curated)
    if (datasetId === definition.id) joinRecord(records, record, true);

  const corrected = applyCorrections([...records.values()], definition, corrections).map(
    (answer): CatalogueRecord => ({
      ...answer,
      id: answer.id!,
      facts: (answer as CatalogueRecord).facts ?? {},
    }),
  );
  applyTags(
    corrected,
    tags.filter((tag) => tag.datasetId === definition.id),
  );
  if (corrected.length < definition.minimumRecords || corrected.length > definition.maximumRecords)
    throw new Error(
      `${definition.id}: dataset has ${corrected.length} records outside expected bounds`,
    );
  const revision = digest({ definition, records: corrected });
  return {
    schemaVersion: 1,
    reviews,
    source: {
      id: definition.id,
      name: definition.name,
      url: "repo:content/datasets.json",
      revision,
      sha256: revision,
      license: "LicenseRef-SeeSourceAttributions",
    },
    records: corrected,
  };
};
