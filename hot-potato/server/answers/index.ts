import { answerKeys, nameForms, symbolKey } from "./normalize.js";
import type { Answer, AnswerProvider } from "./types.js";

interface AnswerIndex {
  names: Map<string, Answer[]>;
  symbols: Map<string, Answer[]>;
}

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
  readonly providers = new Map<string, { provider: AnswerProvider; index: AnswerIndex }>();
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
}
