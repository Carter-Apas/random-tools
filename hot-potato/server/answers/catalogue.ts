import data from "./data/catalogue.json" with { type: "json" };
import type { CompiledCatalogue, CompiledPack } from "./catalogue-types.js";

const validPack = (pack: CompiledPack): boolean =>
  pack.categoryId === pack.definition.id &&
  pack.answers.length >= pack.definition.minimumAnswers &&
  pack.answers.every((answer) =>
    Boolean(answer.id && answer.label && Array.isArray(answer.aliases)),
  );

export const readCatalogue = (input: unknown): CompiledCatalogue => {
  const catalogue = input as CompiledCatalogue;
  if (catalogue.schemaVersion !== 2 || !catalogue.version || !Array.isArray(catalogue.packs))
    throw new Error("Unsupported answer catalogue");
  if (new Set(catalogue.packs.map((pack) => pack.categoryId)).size !== catalogue.packs.length)
    throw new Error("Duplicate category packs");
  if (!catalogue.packs.every(validPack)) throw new Error("Invalid answer pack");
  return catalogue;
};

export const publishedCatalogue = readCatalogue(data);
export const publishedPacks = new Map(
  publishedCatalogue.packs.map((pack) => [pack.categoryId, pack]),
);
