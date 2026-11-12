import { editDistance } from "./edit-distance.js";
import { normalize } from "./normalize.js";
import lexicon from "./data/spelling-words.json" with { type: "json" };
import type { Answer } from "./types.js";

const words = new Set(lexicon.words.split("\n").map(normalize));

export const isDictionaryPhrase = (raw: string): boolean => {
  const tokens = raw.trim().split(/\s+/).map(normalize).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => words.has(token));
};

const shortTypo = (raw: string, key: string): boolean => {
  if (key.length >= 5) return true;
  if (raw.length === key.length) {
    for (let i = 0; i < key.length - 1; i += 1) {
      const swapped = key.slice(0, i) + key[i + 1] + key[i] + key.slice(i + 2);
      if (swapped === raw) return true;
    }
  }
  for (let i = 1; i < raw.length; i += 1) {
    if (raw[i] === raw[i - 1] && raw.slice(0, i) + raw.slice(i + 1) === key) return true;
  }
  return false;
};

const acceptable = (raw: string, key: string, distance: number): boolean =>
  shortTypo(raw, key) && distance <= (Math.max(raw.length, key.length) >= 10 ? 2 : 1);

export class SpellingIndex {
  private readonly lengths = new Map<number, [string, Answer[]][]>();
  private readonly cache = new Map<string, Answer | undefined>();

  constructor(names: Map<string, Answer[]>) {
    for (const [key, answers] of names) {
      if (key.length < 4 || !/^[a-z]+$/.test(key)) continue;
      const bucket = this.lengths.get(key.length) ?? [];
      bucket.push([key, answers]);
      this.lengths.set(key.length, bucket);
    }
  }

  find(raw: string): Answer | undefined {
    if (raw.length < 4 || raw.length > 100) return undefined;
    if (this.cache.has(raw)) return this.cache.get(raw);
    const closest = this._search(raw);
    const result = closest.size === 1 ? closest.values().next().value : undefined;
    if (this.cache.size >= 256) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(raw, result);
    return result;
  }

  private _search(raw: string): Map<string, Answer> {
    let best = 3;
    const closest = new Map<string, Answer>();
    for (let length = raw.length - 2; length <= raw.length + 2; length += 1) {
      for (const [key, answers] of this.lengths.get(length) ?? []) {
        const distance = editDistance(raw, key, Math.min(2, best));
        if (distance > best || !acceptable(raw, key, distance)) continue;
        if (distance < best) {
          closest.clear();
          best = distance;
        }
        for (const answer of answers) closest.set(answer.id ?? answer.label, answer);
      }
    }
    return closest;
  }
}
