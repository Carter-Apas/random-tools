import type { Answer, NormalizationRules } from "./types.js";

import type { Vegetable } from "../../shared/types.js";

export interface ContentSource {
  id: string;
  name: string;
  url: string;
  license: string;
  revision: string;
  sha256: string;
}

export interface CatalogueRecord extends Answer {
  id: string;
  facts: Record<string, string[]>;
}

export interface SourceSnapshot {
  schemaVersion: 1;
  source: ContentSource;
  records: CatalogueRecord[];
}

export interface CategoryDefinition {
  id: string;
  family?: string;
  name: string;
  prompt: string;
  hint: string;
  vegetable: Vegetable;
  select: { source: string; where?: Record<string, string[]> };
  normalization: NormalizationRules;
  minimumAnswers: number;
  maximumAnswers: number;
}

export interface Correction {
  categoryId: string;
  status: "pending" | "approved";
  action?: "upsert" | "exclude" | "remove-aliases";
  answer: Answer & { id: string };
  evidence: string;
  reason: string;
}

export interface FactCorrection {
  sourceId: string;
  answerId: string;
  facts: Record<string, string[]>;
  evidence: string;
  reason: string;
}

export interface CoverageCase {
  categoryId: string;
  answer: string;
  expected: "accepted" | "rejected";
  difficulty: "common" | "obscure" | "boundary";
  evidence: string;
}

export interface CompiledPack {
  id: string;
  categoryId: string;
  version: string;
  definition: CategoryDefinition;
  sourceIds: string[];
  answers: Answer[];
}

export interface CompiledCatalogue {
  schemaVersion: 2;
  version: string;
  sources: ContentSource[];
  packs: CompiledPack[];
}
