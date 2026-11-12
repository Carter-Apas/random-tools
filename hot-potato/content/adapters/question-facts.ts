import { createHash } from "node:crypto";

import type { Answer } from "../../server/answers/types.js";
import type {
  CatalogueRecord,
  ContentSource,
  SourceSnapshot,
} from "../../server/answers/catalogue-types.js";
import { normalize } from "../../server/answers/normalize.js";

export const factSource = (
  id: string,
  name: string,
  url: string,
  body: string,
  license: string,
  revision: string,
): ContentSource => ({
  id,
  name,
  url,
  license,
  revision,
  sha256: createHash("sha256").update(body).digest("hex"),
});

const answerNames = (answers: readonly Answer[]) =>
  new Map(
    answers.flatMap((answer) =>
      [answer.label, ...answer.aliases, ...(answer.symbols ?? [])].map(
        (name) => [normalize(name), answer] as const,
      ),
    ),
  );

const cloneAnswer = (answer: Answer, facts: Record<string, string[]>): CatalogueRecord => ({
  ...answer,
  id: answer.id!,
  aliases: [...answer.aliases],
  facts,
});

const period = (number: number): string =>
  String([2, 10, 18, 36, 54, 86, 118].findIndex((last) => number <= last) + 1);

export const parseElementFacts = (body: string, answers: readonly Answer[]): CatalogueRecord[] => {
  const table = (
    JSON.parse(body) as { Table: { Columns: { Column: string[] }; Row: { Cell: string[] }[] } }
  ).Table;
  const names = answerNames(answers);
  const records = table.Row.map(({ Cell }) => {
    const row = Object.fromEntries(table.Columns.Column.map((key, i) => [key, Cell[i]]));
    const answer = names.get(normalize(row.Name));
    if (!answer) throw new Error(`Unknown PubChem element ${row.Name}`);
    const number = Number(row.AtomicNumber);
    return cloneAnswer(answer, {
      group: [row.GroupBlock],
      state: [row.StandardState],
      period: [period(number)],
      symbolLength: [String(row.Symbol.length)],
      numberBand: [
        number <= 20 ? "first20" : "later",
        number > 92 ? "transuranium" : "throughUranium",
      ],
    });
  });
  if (records.length !== 118 || new Set(records.map((record) => record.id)).size !== 118)
    throw new Error("Incomplete periodic table");
  return records;
};

interface CountryRow {
  name: { common: string; official: string };
  cca3: string;
  unMember: boolean;
  capital: string[];
  altSpellings: string[];
  region: string;
  subregion: string;
  landlocked: boolean;
  currencies: Record<string, { name: string }>;
  languages: Record<string, string>;
}

const countryFacts = (row: CountryRow): Record<string, string[]> => ({
  region: [row.region],
  subregion: [row.subregion],
  landlocked: [String(row.landlocked)],
  languages: Object.keys(row.languages),
  currencies: Object.keys(row.currencies),
});

export const parseCountryFacts = (
  body: string,
  countries: readonly Answer[],
  capitals: readonly Answer[],
) => {
  const rows = (JSON.parse(body) as CountryRow[]).filter(
    (row) => row.unMember && row.cca3 !== "VAT",
  );
  if (rows.length !== 193 || new Set(rows.map((row) => row.cca3)).size !== 193)
    throw new Error("Expected the 193 UN member countries");
  const names = answerNames(countries);
  const cities = answerNames(capitals);
  const records = rows.map((row): CatalogueRecord => {
    const existing = names.get(normalize(row.cca3)) ?? names.get(normalize(row.name.common));
    return {
      id: existing?.id ?? `country:${row.cca3}`,
      label: row.name.common,
      aliases: [...new Set([row.name.official, ...row.altSpellings, ...(existing?.aliases ?? [])])],
      source: "https://github.com/mledoze/countries",
      facts: countryFacts(row),
    };
  });
  const capitalRecords = rows.flatMap((row) =>
    row.capital.map((capital): CatalogueRecord => {
      const existing = cities.get(normalize(capital));
      return {
        id: existing?.id ?? `capital:${normalize(capital)}`,
        label: capital,
        aliases: existing?.aliases ?? [],
        source: "https://github.com/mledoze/countries",
        facts: countryFacts(row),
      };
    }),
  );
  return { countries: records, capitals: capitalRecords };
};

interface FactBinding {
  item: { value: string };
  property: { value: string };
  value: { value: string };
}

export const parseClassificationFacts = (
  body: string,
  answers: readonly Answer[],
): CatalogueRecord[] => {
  const rows = (JSON.parse(body) as { results: { bindings: FactBinding[] } }).results.bindings;
  if (!Array.isArray(rows)) throw new Error("Invalid classification response");
  const records = new Map(answers.map((answer) => [answer.id, cloneAnswer(answer, {})]));
  for (const row of rows) {
    const record = records.get(row.item.value);
    if (!record || !/^[a-zA-Z]+$/.test(row.property.value)) continue;
    const property = row.property.value;
    const value = row.value.value.replace("http://www.wikidata.org/entity/", "");
    record.facts[property] ??= [];
    if (!record.facts[property].includes(value)) record.facts[property].push(value);
  }
  return [...records.values()];
};

export const classifiedSnapshot = (
  source: ContentSource,
  records: CatalogueRecord[],
  minimum: number,
): SourceSnapshot => {
  if (records.filter((record) => Object.keys(record.facts).length).length < minimum)
    throw new Error(`${source.id}: incomplete classification facts`);
  return { schemaVersion: 1, source, records };
};
