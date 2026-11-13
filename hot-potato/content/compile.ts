import { createHash } from "node:crypto";

import { correctFacts } from "./facts.js";

import { AnswerRegistry } from "../server/answers/index.js";
import { normalize } from "../server/answers/normalize.js";
import type { Answer } from "../server/answers/types.js";
import type {
  QuestionDefinition,
  CompiledCatalogue,
  CompiledPack,
  Correction,
  CoverageCase,
  FactCorrection,
  SourceSnapshot,
} from "../server/answers/catalogue-types.js";

export const digest = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export interface PackReview {
  questionId: string;
  sourceRecords: number;
  publishedAnswers: number;
  legacyOnly: string[];
  quarantined: { id: string; label: string; reason: string }[];
  ambiguousNames: string[];
}

const identity = (answer: Answer): string => answer.id ?? answer.label;

const unique = (values: string[]): string[] => [...new Set(values)];

const validName = (name: string): boolean =>
  name.trim().length > 0 && name.length <= 100 && normalize(name).length > 0;

const selectRecords = (definition: QuestionDefinition, snapshot: SourceSnapshot): Answer[] =>
  snapshot.records
    .filter((record) =>
      Object.entries(definition.select.where ?? {}).every(([property, values]) =>
        values.some((value) => record.facts[property]?.includes(value)),
      ),
    )
    .map(({ facts: _facts, ...answer }) => ({
      ...answer,
      aliases: unique([answer.label, ...answer.aliases].filter(validName)),
      evidence: [
        ...(answer.evidence ?? []),
        { sourceId: snapshot.source.id, url: answer.source ?? snapshot.source.url },
      ],
    }));

const matchSeed = (answers: Answer[], seed: Answer, selected: Set<string>): Answer | undefined => {
  const labels = new Set([seed.label, ...seed.aliases].map(normalize));
  const exact = answers.filter((answer) => normalize(answer.label) === normalize(seed.label));
  if (exact.length === 1) return exact[0];
  const alternate = answers.filter((answer) => labels.has(normalize(answer.label)));
  if (alternate.length === 1) return alternate[0];
  const matches = answers.filter((answer) =>
    [answer.label, ...answer.aliases].some((alias) => labels.has(normalize(alias))),
  );
  const linked = matches.filter((answer) => selected.has(identity(answer)));
  if (linked.length === 1) return linked[0];
  return matches.length === 1 ? matches[0] : undefined;
};

export const mergeSeeds = (
  answers: Answer[],
  seeds: readonly Answer[],
  review: PackReview,
): Answer[] => {
  const ordered: Answer[] = [];
  const selected = new Set<string>();
  for (const seed of seeds) {
    const match = matchSeed(answers, seed, selected);
    if (!match) {
      review.legacyOnly.push(seed.label);
      const legacy = {
        ...seed,
        aliases: [...seed.aliases],
        evidence: [{ sourceId: "legacy-curation", url: "repo:content/legacy-answers.json" }],
      };
      ordered.push(legacy);
      selected.add(identity(legacy));
      continue;
    }
    if (!selected.has(identity(match))) match.label = seed.label;
    match.aliases = unique([...seed.aliases, ...match.aliases]);
    if (!selected.has(identity(match))) ordered.push(match);
    selected.add(identity(match));
  }
  const result = [...ordered, ...answers.filter((answer) => !selected.has(identity(answer)))];
  const reserved = new Map(
    ordered.flatMap((answer) =>
      [answer.label, ...answer.aliases].map(
        (alias) => [normalize(alias), identity(answer)] as const,
      ),
    ),
  );
  return result.filter((answer) => {
    answer.aliases = answer.aliases.filter(
      (alias) =>
        !reserved.has(normalize(alias)) || reserved.get(normalize(alias)) === identity(answer),
    );
    const owner = reserved.get(normalize(answer.label));
    if (!owner || owner === identity(answer)) return true;
    const alternative = answer.aliases.find((alias) => !reserved.has(normalize(alias)));
    if (alternative) {
      answer.label = alternative;
      return true;
    }
    review.quarantined.push({
      id: identity(answer),
      label: answer.label,
      reason: "Name reserved by a curated identity; requires disambiguation",
    });
    return false;
  });
};

const mergeCorrection = (existing: Answer, correction: Correction): void => {
  existing.aliases = unique([
    ...existing.aliases,
    correction.answer.label,
    ...correction.answer.aliases,
  ]);
  existing.evidence = [
    ...(existing.evidence ?? []),
    { sourceId: "reviewed-corrections", url: correction.evidence },
  ];
  if (correction.answer.symbols)
    existing.symbols = unique([...(existing.symbols ?? []), ...correction.answer.symbols]);
};

export const applyCorrections = (
  answers: Answer[],
  definition: { id: string },
  corrections: Correction[],
): Answer[] => {
  let result = answers;
  for (const correction of corrections.filter(
    (item) => item.datasetId === definition.id && item.status === "approved",
  )) {
    if (!/^https:\/\//.test(correction.evidence) || !correction.reason.trim())
      throw new Error(`Approved correction for ${definition.id} needs evidence and a reason`);
    if (correction.action === "exclude") {
      result = result.filter((answer) => answer.id !== correction.answer.id);
      continue;
    }
    const existing = result.find((answer) => answer.id === correction.answer.id);
    if (correction.action === "remove-aliases") {
      if (existing)
        existing.aliases = existing.aliases.filter(
          (alias) => !correction.answer.aliases.includes(alias),
        );
      continue;
    }
    const evidence = { sourceId: "reviewed-corrections", url: correction.evidence };
    if (existing) {
      mergeCorrection(existing, correction);
      if (correction.answer.facts) {
        const record = existing as Answer & { facts?: Record<string, string[]> };
        record.facts = { ...record.facts, ...correction.answer.facts };
      }
    } else result.push({ ...correction.answer, source: correction.evidence, evidence: [evidence] });
  }
  return result;
};

const registryFor = (definition: QuestionDefinition, answers: Answer[]): AnswerRegistry => {
  const registry = new AnswerRegistry();
  registry.register({
    id: definition.id,
    questionId: definition.id,
    answers,
    normalization: definition.normalization,
  });
  return registry;
};

const resolveLabels = (
  definition: QuestionDefinition,
  answers: Answer[],
  review: PackReview,
): Answer[] => {
  const registry = registryFor(definition, answers);
  return answers.filter((answer) => {
    const resolved = registry.find(definition.id, answer.label);
    if (resolved?.consumes?.includes(identity(answer))) {
      review.ambiguousNames.push(answer.label);
      return true;
    }
    if (identity(resolved ?? { label: "", aliases: [] }) === identity(answer)) return true;
    const alternative = answer.aliases.find(
      (alias) => registry.find(definition.id, alias)?.id === answer.id,
    );
    if (alternative) {
      review.ambiguousNames.push(answer.label);
      answer.label = alternative;
      return true;
    }
    review.quarantined.push({
      id: identity(answer),
      label: answer.label,
      reason: "No unambiguous playable name",
    });
    return false;
  });
};

export const compilePack = (
  definition: QuestionDefinition,
  snapshot: SourceSnapshot,
): { pack: CompiledPack; review: PackReview } => {
  const selected = selectRecords(definition, snapshot);
  const properties = new Set(snapshot.records.flatMap((record) => Object.keys(record.facts)));
  for (const [property, values] of Object.entries(definition.select.where ?? {})) {
    if (!properties.has(property) || !Array.isArray(values) || !values.length)
      throw new Error(`${definition.id}: unknown or empty dataset filter ${property}`);
  }
  const review: PackReview = {
    questionId: definition.id,
    sourceRecords: selected.length,
    publishedAnswers: 0,
    legacyOnly: [],
    quarantined: [],
    ambiguousNames: [],
  };
  const playable = resolveLabels(definition, selected, review);
  review.publishedAnswers = playable.length;
  if (playable.length < definition.minimumAnswers || playable.length > definition.maximumAnswers)
    throw new Error(
      `${definition.id}: ${playable.length} answers outside ${definition.minimumAnswers}–${definition.maximumAnswers}`,
    );
  const sourceIds = unique(
    playable.flatMap((answer) => answer.evidence?.map((item) => item.sourceId) ?? []),
  );
  const version = digest({ definition, answers: playable });
  return {
    pack: {
      id: `question-${definition.id}`,
      questionId: definition.id,
      datasetId: definition.datasetId,
      version,
      definition,
      sourceIds,
      answers: playable,
    },
    review,
  };
};

export const checkCoverage = (packs: CompiledPack[], cases: CoverageCase[]) => {
  for (const fixture of cases) {
    if (!packs.some((pack) => pack.questionId === fixture.questionId))
      throw new Error(`Unknown fixture question: ${fixture.questionId}`);
  }
  const registry = new AnswerRegistry();
  for (const pack of packs)
    registry.register({ ...pack, normalization: pack.definition.normalization });
  return cases.map((fixture) => ({
    ...fixture,
    passed:
      Boolean(registry.find(fixture.questionId, fixture.answer)) ===
      (fixture.expected === "accepted"),
  }));
};

export const compileCatalogue = (
  definitions: QuestionDefinition[],
  snapshots: SourceSnapshot[],
  factCorrections: FactCorrection[] = [],
) => {
  if (new Set(definitions.map((definition) => definition.id)).size !== definitions.length)
    throw new Error("Duplicate question definition");
  const compiled = definitions.map((definition) => {
    const snapshot = snapshots.find((item) => item.source.id === definition.datasetId);
    if (!snapshot) throw new Error(`Missing source ${definition.datasetId}`);
    return compilePack(definition, correctFacts(snapshot, factCorrections));
  });
  const packs = compiled.map((item) => item.pack);
  const sources = snapshots
    .map((snapshot) => snapshot.source)
    .sort((a, b) => a.id.localeCompare(b.id));
  const internalSources = [
    {
      id: "reviewed-facts",
      name: "Reviewed classification facts",
      url: "repo:content/fact-corrections.json",
      content: factCorrections,
      license: "LicenseRef-ReviewedFacts",
    },
  ];
  for (const source of internalSources) {
    if (!packs.some((pack) => pack.sourceIds.includes(source.id))) continue;
    sources.push({
      id: source.id,
      name: source.name,
      url: source.url,
      license: source.license,
      revision: digest(source.content),
      sha256: digest(source.content),
    });
  }
  const datasets = snapshots.map((snapshot) => ({
    id: snapshot.source.id,
    name: snapshot.source.name,
    description: snapshot.source.name,
    records: snapshot.records.length,
    properties: [
      ...new Set(snapshot.records.flatMap((record) => Object.keys(record.facts))),
    ].sort(),
    sourceIds: [snapshot.source.id],
  }));
  const catalogue: CompiledCatalogue = {
    schemaVersion: 3,
    version: digest({ sources, datasets, packs }),
    sources,
    datasets,
    packs,
  };
  return { catalogue, reviews: compiled.map((item) => item.review) };
};
