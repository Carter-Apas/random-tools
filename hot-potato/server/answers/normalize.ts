import pluralize from "pluralize";

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

export const nameForms = (categoryId: string, value: string): string[] => {
  const forms = [value];
  if (!pluralCategories.has(categoryId) || value.length < 3) return forms;
  forms.push(pluralize.plural(value));
  if (categoryId === "units") {
    const words = value.split(" ");
    words[0] = pluralize.plural(words[0]);
    forms.push(words.join(" "));
  }
  return forms;
};

export const answerKeys = (categoryId: string, value: string): string[] => {
  const key = normalize(value);
  if (categoryId === "rivers") return [key, key.replace(/river$/, "")];
  if (categoryId === "seas") return [key, key.replace(/sea$/, "")];
  if (categoryId === "ranges") return [key, key.replace(/(mountains|range)$/, "")];
  return [key];
};
