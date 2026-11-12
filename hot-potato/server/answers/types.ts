export interface Answer {
  id?: string;
  label: string;
  aliases: string[];
  symbols?: string[];
  source?: string;
  evidence?: { sourceId: string; url: string }[];
  consumes?: string[];
}

export interface NormalizationRules {
  plurals?: boolean;
  suffixes?: string[];
  ambiguousNames?: "reject" | "consume-all";
  typos?: "canonical" | "aliases" | "off";
}

export interface AnswerPack {
  schemaVersion: number;
  id: string;
  categoryId: string;
  source: { name: string; url: string; revision: string; sha256: string; license: string };
  answers: Answer[];
}

export interface AnswerProvider {
  id: string;
  categoryId: string;
  answers: readonly Answer[];
  normalization?: NormalizationRules;
}
