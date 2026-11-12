import { answerKeys, nameForms, symbolKey } from "./normalize.js";
import type { Answer, AnswerProvider } from "./types.js";

interface AnswerIndex {
  names: Map<string, Answer | null>;
  symbols: Map<string, Answer | null>;
}

const addKey = (index: Map<string, Answer | null>, key: string, answer: Answer): void => {
  if (!key) return;
  const existing = index.get(key);
  if (existing === undefined) {
    index.set(key, answer);
    return;
  }
  if ((existing?.id ?? existing?.label) !== (answer.id ?? answer.label)) index.set(key, null);
};

const compile = (provider: AnswerProvider): AnswerIndex => {
  const result: AnswerIndex = { names: new Map(), symbols: new Map() };
  for (const answer of provider.answers) {
    for (const symbol of answer.symbols ?? []) addKey(result.symbols, symbolKey(symbol), answer);
    for (const alias of [answer.label, ...answer.aliases]) {
      for (const form of nameForms(provider.categoryId, alias)) {
        for (const key of answerKeys(provider.categoryId, form)) addKey(result.names, key, answer);
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
    if (symbol) return symbol;
    if (symbol === null) return undefined;
    for (const key of answerKeys(categoryId, raw)) {
      const answer = entry.index.names.get(key);
      if (answer) return answer;
      if (answer === null) return undefined;
    }
    return undefined;
  }
}
