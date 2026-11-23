import pluralize from "pluralize";

import type { NormalizationRules } from "./types.js";

export const normalize = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const symbolKey = (value: string): string =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ");

const pluralCategories = new Set([
  "units",
  "fruit",
  "vegetables",
  "pets",
  "instruments",
  "sports",
  "herbs",
  "farm",
  "trees",
  "flowers",
  "pasta",
  "cheeses",
  "spices",
  "pulses",
]);

export const nameForms = (
  questionId: string,
  value: string,
  rules?: NormalizationRules,
): string[] => {
  const forms = [value];
  if (rules?.singulars) forms.push(pluralize.singular(value));
  if (!(rules?.plurals ?? pluralCategories.has(questionId)) || value.length < 3) return forms;
  forms.push(pluralize.plural(value));
  if (questionId === "units" || rules?.pluralFirstWord) {
    const words = value.split(" ");
    words[0] = pluralize.plural(words[0]);
    forms.push(words.join(" "));
  }
  return forms;
};

const legacySuffixes: Record<string, string[]> = {
  rivers: ["river"],
  seas: ["sea"],
  ranges: ["mountains", "range"],
};

const wordKeys = (value: string): string[] =>
  value
    .split(/[^\p{L}\p{M}\p{N}'’.]+/u)
    .map(normalize)
    .filter(Boolean);

const withoutEnding = (words: string[], ending: string[]): string[] | undefined =>
  ending.length > 0 &&
  words.length > ending.length &&
  ending.every((word, index) => words[words.length - ending.length + index] === word)
    ? words.slice(0, -ending.length)
    : undefined;

const withoutOpening = (words: string[], opening: string[]): string[] | undefined =>
  opening.length > 0 &&
  words.length > opening.length &&
  opening.every((word, index) => words[index] === word)
    ? words.slice(opening.length)
    : undefined;

const present = (words: string[] | undefined): words is string[] => words !== undefined;

export const answerKeys = (
  questionId: string,
  value: string,
  rules?: NormalizationRules,
): string[] => {
  const words = wordKeys(value);
  const suffixes = rules?.suffixes ?? legacySuffixes[questionId] ?? [];
  const prefixes = [...(rules?.prefixes ?? []), "the"];
  const shortened = [
    words,
    ...suffixes.map((suffix) => withoutEnding(words, wordKeys(suffix))).filter(present),
  ];
  const optional = [
    ...shortened.slice(1),
    ...shortened.flatMap((name) =>
      prefixes.map((prefix) => withoutOpening(name, wordKeys(prefix))).filter(present),
    ),
  ].map((name) => name.join(""));
  const categoryWords = new Set([...suffixes, ...prefixes].map(normalize));
  return [...new Set([normalize(value), ...optional.filter((key) => !categoryWords.has(key))])];
};
