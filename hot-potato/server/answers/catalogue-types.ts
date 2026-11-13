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

export interface DatasetDefinition {
  id: string;
  name: string;
  description: string;
  imports: {
    source: string;
    facts?: Record<string, string[]>;
    legacyKey?: string;
    mode?: "enrich";
  }[];
  minimumRecords: number;
  maximumRecords: number;
  normalization: NormalizationRules;
}

export interface QuestionDefinition {
  id: string;
  datasetId: string;
  name: string;
  prompt: string;
  hint: string;
  vegetable: Vegetable;
  select: { where?: Record<string, string[]> };
  normalization?: NormalizationRules;
  minimumAnswers: number;
  maximumAnswers: number;
}

export interface Correction {
  datasetId: string;
  status: "pending" | "approved";
  action?: "upsert" | "exclude" | "remove-aliases";
  answer: Answer & { id: string; facts?: Record<string, string[]> };
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
  questionId: string;
  answer: string;
  expected: "accepted" | "rejected";
  difficulty: "common" | "obscure" | "boundary";
  evidence: string;
}

export interface CompiledPack {
  id: string;
  questionId: string;
  version: string;
  datasetId: string;
  definition: QuestionDefinition;
  sourceIds: string[];
  answers: Answer[];
}

export interface CompiledCatalogue {
  schemaVersion: 3;
  version: string;
  sources: ContentSource[];
  packs: CompiledPack[];
  datasets: {
    id: string;
    name: string;
    description: string;
    records: number;
    properties: string[];
    sourceIds: string[];
  }[];
}
