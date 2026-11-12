import { createHash } from "node:crypto";

import { fetchSourceText } from "../http.js";
import type { CatalogueRecord, SourceSnapshot } from "../../server/answers/catalogue-types.js";

export interface WikidataCollection {
  id: string;
  membership: string;
  extra?: string;
  minimumRecords: number;
  excludeLabels?: string[];
}

export const wikidataCollections: WikidataCollection[] = [
  {
    id: "pasta",
    membership:
      "{ { ?item wdt:P279+ wd:Q178. } UNION { ?item wdt:P31/wdt:P279* wd:Q2625877. } } FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q18679685. }",
    minimumRecords: 100,
  },
  {
    id: "cheeses",
    membership: "{ ?item wdt:P279+ wd:Q10943. } UNION { ?item wdt:P31 wd:Q10943. }",
    minimumRecords: 400,
  },
  { id: "genres", membership: "?item wdt:P31/wdt:P279* wd:Q188451.", minimumRecords: 500 },
  { id: "instruments", membership: "?item wdt:P279+ wd:Q34379.", minimumRecords: 500 },
  {
    id: "seas",
    membership:
      "?item wdt:P31/wdt:P279* wd:Q165. FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q23397. } FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q9430. }",
    minimumRecords: 80,
  },
  {
    id: "elements",
    membership:
      "?item wdt:P31 wd:Q11344; wdt:P1086 ?number. FILTER(?number >= 1 && ?number <= 118)",
    extra: "OPTIONAL { ?item wdt:P246 ?symbol. }",
    minimumRecords: 118,
  },
  {
    id: "moons",
    membership:
      "VALUES ?parent { wd:Q2 wd:Q111 wd:Q319 wd:Q193 wd:Q324 wd:Q332 wd:Q339 wd:Q558 wd:Q422 wd:Q407 } ?item wdt:P397 ?parent; wdt:P31/wdt:P279* wd:Q2537.",
    minimumRecords: 150,
    excludeLabels: [
      "^(S/|[0-9]|Jupiter [IVXLCDM]+$|Saturn [IVXLCDM]+$|Uranus [IVXLCDM]+$|Neptune [IVXLCDM]+$)",
    ],
  },
  {
    id: "countries",
    membership:
      "?item p:P463 ?membership. ?membership ps:P463 wd:Q1065. FILTER NOT EXISTS { ?membership pq:P582 ?end. } FILTER NOT EXISTS { ?item wdt:P576 ?dissolved. }",
    extra: "OPTIONAL { ?item wdt:P30 ?continent. }",
    minimumRecords: 193,
  },
];

type Binding = Record<string, { value: string; "xml:lang"?: string }>;

export const wikidataQuery = (collection: WikidataCollection): string => `
SELECT DISTINCT ?item ?label ?alias ?symbol ?continent WHERE {
  ${collection.membership}
  ?item rdfs:label ?label. FILTER(LANG(?label) IN ("en", "mul"))
  OPTIONAL { ?item skos:altLabel ?alias. FILTER(LANG(?alias) IN ("en", "mul")) }
  ${collection.extra ?? ""}
}`;

const acceptedLanguage = (value?: string): boolean => ["en", "mul"].includes(value ?? "");

const excludedName = (value: string, collection: WikidataCollection): boolean =>
  Boolean(collection.excludeLabels?.some((pattern) => new RegExp(pattern).test(value)));

const validRow = (row: Binding, collection: WikidataCollection): boolean => {
  if (!row.item?.value.startsWith("http://www.wikidata.org/entity/Q")) return false;
  if (!row.label?.value || row.label.value.length > 100) return false;
  return acceptedLanguage(row.label["xml:lang"]) && !excludedName(row.label.value, collection);
};

const addRow = (record: CatalogueRecord, row: Binding, englishLabels: Set<string>): void => {
  const label = row.label.value;
  if (record.label !== label) record.aliases.push(label);
  if (row.label["xml:lang"] === "en" && !englishLabels.has(record.id)) {
    record.aliases.push(record.label);
    record.label = label;
    englishLabels.add(record.id);
  }
  if (row.alias?.value && acceptedLanguage(row.alias["xml:lang"]))
    record.aliases.push(row.alias.value);
  if (row.symbol?.value) record.symbols?.push(row.symbol.value);
};

const addFacts = (record: CatalogueRecord, row: Binding): void => {
  if (!row.continent?.value) return;
  record.facts.continents ??= [];
  record.facts.continents.push(row.continent.value.split("/").at(-1)!);
};

export const parseWikidata = (
  rows: Binding[],
  collection: WikidataCollection,
): CatalogueRecord[] => {
  const records = new Map<string, CatalogueRecord>();
  const englishLabels = new Set<string>();
  for (const row of rows) {
    if (!validRow(row, collection)) continue;
    const id = row.item.value;
    const label = row.label.value;
    const record = records.get(id) ?? {
      id,
      label,
      aliases: [],
      symbols: [],
      source: id.replace("http:", "https:"),
      facts: {},
    };
    addRow(record, row, englishLabels);
    addFacts(record, row);
    records.set(id, record);
  }
  return [...records.values()]
    .map((record) => ({
      ...record,
      aliases: [...new Set(record.aliases)]
        .filter((alias) => !excludedName(alias, collection))
        .sort(),
      symbols: [...new Set(record.symbols)].sort(),
      facts: Object.fromEntries(
        Object.entries(record.facts).map(([key, values]) => [key, [...new Set(values)].sort()]),
      ),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
};

export const fetchWikidata = async (
  collection: WikidataCollection,
  fetcher: typeof fetch = fetch,
): Promise<SourceSnapshot> => {
  const query = wikidataQuery(collection);
  const url = new URL("https://query.wikidata.org/sparql");
  url.searchParams.set("query", query);
  url.searchParams.set("format", "json");
  const body = await fetchSourceText(url, fetcher);
  const parsed = JSON.parse(body) as { results?: { bindings?: Binding[] } };
  if (!Array.isArray(parsed.results?.bindings)) throw new Error("Invalid Wikidata response");
  const records = parseWikidata(parsed.results.bindings, collection);
  if (records.length < collection.minimumRecords)
    throw new Error(`${collection.id}: incomplete import (${records.length} records)`);
  return {
    schemaVersion: 1,
    source: {
      id: `wikidata-${collection.id}`,
      name: `Wikidata ${collection.id}`,
      url: url.href,
      license: "CC0-1.0",
      revision: new Date().toISOString(),
      sha256: createHash("sha256").update(body).digest("hex"),
    },
    records,
  };
};
