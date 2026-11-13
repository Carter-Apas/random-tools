import type { Answer } from "./types.js";
import type { CompiledCatalogue, CompiledPack } from "./catalogue-types.js";

interface StoredPack extends Omit<CompiledPack, "answers"> {
  answerIds: string[];
  displayLabels?: Record<string, string>;
}

interface StoredCatalogue extends Omit<CompiledCatalogue, "packs"> {
  entities: Record<string, Answer[]>;
  packs: StoredPack[];
}

export const storeCatalogue = (catalogue: CompiledCatalogue): StoredCatalogue => {
  const tables = new Map<string, Map<string, Answer>>();
  const packs = catalogue.packs.map(({ answers, ...pack }): StoredPack => {
    const table = tables.get(pack.datasetId) ?? new Map<string, Answer>();
    tables.set(pack.datasetId, table);
    const displayLabels: Record<string, string> = {};
    for (const answer of answers) {
      const existing = table.get(answer.id!);
      if (!existing) table.set(answer.id!, answer);
      else if (existing.label !== answer.label) displayLabels[answer.id!] = answer.label;
    }
    return {
      ...pack,
      answerIds: answers.map((answer) => answer.id!),
      ...(Object.keys(displayLabels).length ? { displayLabels } : {}),
    };
  });
  return {
    ...catalogue,
    entities: Object.fromEntries([...tables].map(([id, table]) => [id, [...table.values()]])),
    packs,
  };
};

export const readCatalogue = (input: unknown): CompiledCatalogue => {
  if (!input || typeof input !== "object") throw new Error("Unsupported answer catalogue");
  const stored = input as StoredCatalogue;
  if (
    stored.schemaVersion !== 3 ||
    !stored.version ||
    !Array.isArray(stored.packs) ||
    !Array.isArray(stored.datasets) ||
    !stored.entities
  )
    throw new Error("Unsupported answer catalogue");
  const datasetIds = new Set(stored.datasets.map((dataset) => dataset.id));
  if (datasetIds.size !== stored.datasets.length) throw new Error("Duplicate datasets");
  const tables = new Map(
    Object.entries(stored.entities).map(([id, answers]) => {
      if (
        !Array.isArray(answers) ||
        answers.some((answer) => !answer.id || !answer.label || !Array.isArray(answer.aliases))
      )
        throw new Error(`Invalid dataset entities: ${id}`);
      const table = new Map(answers.map((answer) => [answer.id!, answer]));
      if (table.size !== answers.length) throw new Error(`Duplicate dataset identity: ${id}`);
      return [id, table] as const;
    }),
  );
  if (new Set(stored.packs.map((pack) => pack.questionId)).size !== stored.packs.length)
    throw new Error("Duplicate question packs");
  const packs = stored.packs.map(({ answerIds, displayLabels, ...pack }): CompiledPack => {
    if (
      pack.questionId !== pack.definition.id ||
      pack.datasetId !== pack.definition.datasetId ||
      !datasetIds.has(pack.datasetId) ||
      !Array.isArray(answerIds)
    )
      throw new Error("Invalid question pack");
    if (
      answerIds.length < pack.definition.minimumAnswers ||
      answerIds.length > pack.definition.maximumAnswers
    )
      throw new Error(`Invalid question size: ${pack.questionId}`);
    const table = tables.get(pack.datasetId);
    const answers = answerIds.map((id) => {
      const answer = table?.get(id);
      if (!answer) throw new Error(`Unknown dataset identity: ${pack.datasetId}/${id}`);
      return displayLabels?.[id] ? { ...answer, label: displayLabels[id] } : answer;
    });
    return { ...pack, answers };
  });
  return {
    schemaVersion: 3,
    version: stored.version,
    sources: stored.sources,
    datasets: stored.datasets,
    packs,
  };
};
