import pack from "./data/units.json" with { type: "json" };
import { withSIPrefixes } from "./prefixes.js";
import { normalize } from "./normalize.js";
import type { Answer } from "./types.js";

export const withUnitPack = (seed: Answer[]): Answer[] => {
  const answers = pack.answers.map((answer) => ({
    ...answer,
    aliases: [...answer.aliases],
    symbols: [...answer.symbols],
  }));
  const index = new Map<string, number>();
  answers.forEach((answer, i) => {
    for (const alias of [answer.label, ...answer.aliases]) index.set(normalize(alias), i);
  });
  const symbols = new Map(
    answers.flatMap((answer, i) => answer.symbols.map((symbol) => [symbol, i] as const)),
  );
  const extra: Answer[] = [];
  for (const answer of seed) {
    const position =
      index.get(normalize(answer.label)) ??
      answer.aliases
        .map((alias) => index.get(normalize(alias)) ?? symbols.get(alias))
        .find((value) => value !== undefined);
    if (position === undefined) {
      extra.push(answer);
      continue;
    }
    const match = answers[position];
    match.label = answer.label;
    for (const alias of answer.aliases) {
      if (alias.length <= 2) match.symbols.push(alias);
      else match.aliases.push(alias);
    }
  }
  return withSIPrefixes([...extra, ...answers]);
};
