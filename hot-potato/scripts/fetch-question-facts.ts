import { createHash } from "node:crypto";
import { Parser, Store, DataFactory } from "n3";

import { publishedPacks } from "../server/answers/catalogue.js";
import type { Answer } from "../server/answers/types.js";
import { normalize } from "../server/answers/normalize.js";
import { fetchSourceText } from "../content/http.js";
import { readJson, saveSnapshot } from "../content/io.js";
import {
  classifiedSnapshot,
  factSource,
  parseClassificationFacts,
  parseCountryFacts,
  parseElementFacts,
} from "../content/adapters/question-facts.js";
import type { CatalogueRecord } from "../server/answers/catalogue-types.js";

const collections = await readJson<
  { id: string; questionId: string; minimum: number; where: string }[]
>(new URL("../content/question-facts.json", import.meta.url));
const requested = new Set(process.argv.slice(2));
const validIds = new Set([
  "element-properties",
  "country-properties",
  "unit-quantities",
  ...collections.map((item) => item.id),
]);
for (const id of requested)
  if (!validIds.has(id)) throw new Error(`Unknown question-fact source: ${id}`);

const selected = (id: string) => requested.size === 0 || requested.has(id);
const legacy = await readJson<Record<string, Answer[]>>(
  new URL("../content/legacy-answers.json", import.meta.url),
);
const answers = (id: string) => publishedPacks.get(id)?.answers ?? legacy[id];
const revision = "fa4f62182d19ff4f8b325cde6387c9cd9d80955a";
const countryUrl = `https://raw.githubusercontent.com/mledoze/countries/${revision}/countries.json`;
const get = async (id: string, url: string): Promise<string> => {
  console.log(`Fetching ${id}...`);
  return fetchSourceText(url);
};

if (selected("element-properties")) {
  const url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON";
  const body = await get("element-properties", url);
  const records = parseElementFacts(body, answers("elements"));
  await saveSnapshot(
    classifiedSnapshot(
      factSource(
        "element-properties",
        "PubChem periodic table",
        url,
        body,
        "Public-Domain",
        new Date().toISOString(),
      ),
      records,
      118,
    ),
  );
  console.log(`Saved element-properties: ${records.length} elements`);
}
if (selected("country-properties")) {
  const body = await get("country-properties", countryUrl);
  const records = parseCountryFacts(
    body,
    [...answers("africa"), ...answers("europe")],
    answers("capitals"),
  );
  for (const [id, values] of [
    ["country-properties", records.countries],
    ["capital-properties", records.capitals],
  ] as const) {
    await saveSnapshot(
      classifiedSnapshot(
        factSource(id, "mledoze countries", countryUrl, body, "ODbL-1.0", revision),
        values,
        193,
      ),
    );
    console.log(`Saved ${id}: ${values.length} records`);
  }
}
if (selected("unit-quantities")) {
  const pack = await readJson<{ source: { url: string; sha256: string; revision: string } }>(
    new URL("../server/answers/data/units.json", import.meta.url),
  );
  const body = await get("unit-quantities", pack.source.url);
  if (createHash("sha256").update(body).digest("hex") !== pack.source.sha256)
    throw new Error("Pinned QUDT checksum changed");
  const store = new Store(new Parser().parse(body));
  const named = DataFactory.namedNode;
  const units = answers("units");
  const byName = new Map(
    units.flatMap((answer) =>
      [answer.label, ...answer.aliases].map((name) => [normalize(name), answer] as const),
    ),
  );
  const records = units.map((answer): CatalogueRecord => {
    const base = answer.id!.startsWith("si-prefix:")
      ? byName.get(normalize(answer.id!.split(":")[2]))
      : answer;
    const quantities = base
      ? [
          ...store.getObjects(
            named(base.id!),
            named("http://qudt.org/schema/qudt/hasQuantityKind"),
            null,
          ),
          ...store.getObjects(
            named(base.id!),
            named("http://qudt.org/schema/qudt/unitForQuantityKind"),
            null,
          ),
        ].map((value) => value.value.split("/").at(-1)!)
      : [];
    return { ...answer, id: answer.id!, facts: quantities.length ? { quantity: quantities } : {} };
  });
  await saveSnapshot(
    classifiedSnapshot(
      factSource(
        "unit-quantities",
        "QUDT unit quantity kinds",
        pack.source.url,
        body,
        "CC-BY-4.0",
        pack.source.revision,
      ),
      records,
      2000,
    ),
  );
  console.log(
    `Saved unit-quantities: ${records.filter((record) => record.facts.quantity).length} classified units`,
  );
}

for (const collection of collections.filter((item) => selected(item.id))) {
  const query = `SELECT DISTINCT ?item ?property ?value WHERE { ${collection.where} }`;
  const url = new URL("https://query.wikidata.org/sparql");
  url.searchParams.set("query", query);
  url.searchParams.set("format", "json");
  const body = await get(collection.id, url.href);
  const base = answers(collection.questionId);
  const records = parseClassificationFacts(body, base);
  const source = factSource(
    collection.id,
    `Wikidata ${collection.id} with reviewed names`,
    url.href,
    JSON.stringify({ answers: base, classifications: body }),
    "CC0-1.0",
    new Date().toISOString(),
  );
  await saveSnapshot(classifiedSnapshot(source, records, collection.minimum));
  console.log(
    `Saved ${collection.id}: ${records.filter((record) => Object.keys(record.facts).length).length} classified identities`,
  );
}
