import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { Parser, Store, DataFactory } from "n3";

const revision = "39bd2d3f5050d8b24e083b48a3af31f3fe1badc8";
const base = `https://raw.githubusercontent.com/qudt/qudt-public-repo/${revision}`;
const url = `${base}/src/main/rdf/vocab/unit/VOCAB_QUDT-UNITS-ALL.ttl`;
const headers = { "User-Agent": "hot-potato-answer-packs/1.0" };
const response = await fetch(url, { headers });
if (!response.ok) throw new Error(`QUDT returned ${response.status}`);
const text = await response.text();
const store = new Store(new Parser().parse(text));
const named = DataFactory.namedNode;
const q = "http://qudt.org/schema/qudt/";
const rdfs = "http://www.w3.org/2000/01/rdf-schema#";
const skos = "http://www.w3.org/2004/02/skos/core#";
const rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const literals = (subject, predicate) =>
  store.getObjects(subject, named(predicate), null).filter((item) => item.termType === "Literal");
const english = (subject, predicate) =>
  literals(subject, predicate)
    .filter((item) => !item.language || item.language.startsWith("en"))
    .map((item) => item.value);
const answers = [];
for (const subject of store.getSubjects(named(rdf + "type"), named(q + "Unit"), null)) {
  if (literals(subject, q + "deprecated").some((item) => item.value === "true")) continue;
  const labels = [...new Set(english(subject, rdfs + "label"))].filter(
    (label) => label.length <= 100,
  );
  if (!labels.length) continue;
  const label = labels[0];
  const aliases = [...new Set([...labels, ...english(subject, skos + "altLabel")])];
  const symbols = [
    ...new Set([...english(subject, q + "symbol"), ...english(subject, q + "ucumCode")]),
  ].filter((value) => value.length <= 100);
  answers.push({ id: subject.value, label, aliases, symbols, source: subject.value });
}
const parents = new Map(answers.map((answer) => [answer.id, answer.id]));
const root = (id) => {
  let current = id;
  while (parents.get(current) !== current) current = parents.get(current);
  return current;
};
for (const answer of answers) {
  for (const equivalent of store.getObjects(named(answer.id), named(q + "exactMatch"), null)) {
    if (!parents.has(equivalent.value)) continue;
    const a = root(answer.id),
      b = root(equivalent.value);
    parents.set(a < b ? b : a, a < b ? a : b);
  }
}
const groups = new Map();
for (const answer of answers) {
  const id = root(answer.id);
  const existing = groups.get(id);
  if (!existing) groups.set(id, { ...answer, id });
  else {
    existing.aliases = [...new Set([...existing.aliases, answer.label, ...answer.aliases])];
    existing.symbols = [...new Set([...existing.symbols, ...answer.symbols])];
  }
}
answers.splice(0, answers.length, ...groups.values());
answers.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
if (answers.length < 1000) throw new Error("QUDT pack unexpectedly small; refusing to replace it");
const pack = {
  schemaVersion: 1,
  id: "qudt-units",
  categoryId: "units",
  source: {
    name: "QUDT units vocabulary",
    url,
    revision,
    sha256: createHash("sha256").update(text).digest("hex"),
    license: "CC-BY-4.0",
  },
  answers,
};
const directory = fileURLToPath(new URL("../server/answers/data/", import.meta.url));
await mkdir(directory, { recursive: true });
await writeFile(directory + "units.json", JSON.stringify(pack, null, 2) + "\n");
const license = await fetch(base + "/LICENSE", { headers });
if (!license.ok) throw new Error("Cannot fetch the QUDT attribution license");
await writeFile(directory + "QUDT-LICENSE.txt", await license.text());
console.log(
  `Compiled ${answers.length} QUDT units from ${revision}; no runtime requests required.`,
);
