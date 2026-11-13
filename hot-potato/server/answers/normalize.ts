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

export const answerKeys = (
  questionId: string,
  value: string,
  rules?: NormalizationRules,
): string[] => {
  const key = normalize(value);
  if (rules?.suffixes) {
    return [
      key,
      ...rules.suffixes
        .map(normalize)
        .filter(Boolean)
        .map((suffix) => (key.endsWith(suffix) ? key.slice(0, -suffix.length) : key)),
    ];
  }
  if (questionId === "rivers") return [key, key.replace(/river$/, "")];
  if (questionId === "seas") return [key, key.replace(/sea$/, "")];
  if (questionId === "ranges") return [key, key.replace(/(mountains|range)$/, "")];
  return [key];
};
