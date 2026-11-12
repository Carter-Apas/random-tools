import { answerKeys, nameForms, normalize, symbolKey } from "./normalize.js";
import type { Answer, AnswerProvider } from "./types.js";
import { SpellingIndex, isDictionaryPhrase } from "./spelling.js";

interface AnswerIndex {
  names: Map<string, Answer[]>;
  symbols: Map<string, Answer[]>;
}

const mayCorrect = (raw: string, recognized: Set<string>): boolean =>
  /^[\p{L}\p{M}\s'’-]+$/u.test(raw) && !recognized.has(normalize(raw)) && !isDictionaryPhrase(raw);

const addKey = (index: Map<string, Answer[]>, key: string, answer: Answer): void => {
  if (!key) return;
  const existing = index.get(key);
  if (existing === undefined) {
    index.set(key, [answer]);
    return;
  }
  if (!existing.some((item) => (item.id ?? item.label) === (answer.id ?? answer.label)))
    existing.push(answer);
};

const resolveNames = (
  answers: Answer[],
  raw: string,
  provider: AnswerProvider,
): Answer | undefined => {
  if (answers.length === 1) return answers[0];
  if (provider.normalization?.ambiguousNames !== "consume-all") return undefined;
  return {
    ...answers[0],
    label: raw.trim(),
    consumes: answers.map((answer) => answer.id ?? answer.label),
  };
};

const compile = (provider: AnswerProvider): AnswerIndex => {
  const result: AnswerIndex = { names: new Map(), symbols: new Map() };
  for (const answer of provider.answers) {
    for (const symbol of answer.symbols ?? []) addKey(result.symbols, symbolKey(symbol), answer);
    for (const alias of [answer.label, ...answer.aliases]) {
      for (const form of nameForms(provider.categoryId, alias, provider.normalization)) {
        for (const key of answerKeys(provider.categoryId, form, provider.normalization))
          addKey(result.names, key, answer);
      }
    }
  }
  return result;
};

export class AnswerRegistry {
  readonly providers = new Map<
    string,
    { provider: AnswerProvider; index: AnswerIndex; spelling?: SpellingIndex }
  >();
  register(provider: AnswerProvider): void {
    this.providers.set(provider.categoryId, { provider, index: compile(provider) });
  }
  find(categoryId: string, raw: string): Answer | undefined {
    const entry = this.providers.get(categoryId);
    if (!entry) return undefined;
    const symbol = entry.index.symbols.get(symbolKey(raw));
    if (symbol) return symbol.length === 1 ? symbol[0] : undefined;
    for (const key of answerKeys(categoryId, raw, entry.provider.normalization)) {
      const answer = entry.index.names.get(key);
      if (answer) return resolveNames(answer, raw, entry.provider);
    }
    return undefined;
  }

  correct(categoryId: string, raw: string, recognized: Set<string>): Answer | undefined {
    const exact = this.find(categoryId, raw);
    if (exact) return exact;
    const entry = this.providers.get(categoryId);
    if (!entry || entry.provider.normalization?.typos === "off") return undefined;
    if (entry.index.symbols.has(symbolKey(raw))) return undefined;
    if (!mayCorrect(raw, recognized)) return undefined;
    const key = normalize(raw);
    if (!entry.spelling) {
      const names =
        entry.provider.normalization?.typos === "canonical"
          ? compile({
              ...entry.provider,
              answers: entry.provider.answers.map((answer) => ({
                ...answer,
                aliases: [],
                symbols: [],
              })),
            }).names
          : entry.index.names;
      entry.spelling = new SpellingIndex(names);
    }
    return entry.spelling.find(key);
  }
}
