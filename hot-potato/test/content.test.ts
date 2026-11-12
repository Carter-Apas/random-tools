import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { test } from "node:test";

import { compileCatalogue, compilePack, checkCoverage } from "../content/compile.js";
import { loadSnapshots } from "../content/io.js";
import { publishCatalogue } from "../content/publication.js";
import { proposeAnswer } from "../content/candidates.js";
import { requireBenchmark } from "../content/baseline.js";
import { fetchSourceText } from "../content/http.js";
import {
  fetchWikidata,
  parseWikidata,
  wikidataCollections,
  wikidataQuery,
} from "../content/adapters/wikidata.js";
import { parseConstellations } from "../content/adapters/nasa.js";
import { AnswerRegistry } from "../server/answers/index.js";
import type {
  CategoryDefinition,
  CompiledCatalogue,
  Correction,
  CoverageCase,
  SourceSnapshot,
} from "../server/answers/catalogue-types.js";

const definition: CategoryDefinition = {
  id: "fixture",
  name: "Fixture",
  prompt: "Name a country",
  hint: "A test category",
  vegetable: "potato",
  select: { source: "fixture-source", where: { continents: ["Africa"] } },
  normalization: { plurals: false },
  minimumAnswers: 1,
  maximumAnswers: 10,
};
const snapshot: SourceSnapshot = {
  schemaVersion: 1,
  source: {
    id: "fixture-source",
    name: "Fixture source",
    url: "https://example.org/catalogue",
    revision: "v1",
    sha256: "a".repeat(64),
    license: "CC0-1.0",
  },
  records: [
    {
      id: "country:kenya",
      label: "Kenya",
      aliases: ["Republic of Kenya"],
      facts: { continents: ["Africa"] },
      source: "https://example.org/kenya",
    },
    {
      id: "country:japan",
      label: "Japan",
      aliases: ["Nippon"],
      facts: { continents: ["Asia"] },
      source: "https://example.org/japan",
    },
  ],
};

const compile = (definitions = [definition]) =>
  compileCatalogue(definitions, [snapshot], new Map(), []);

test("one catalogue source produces independently filtered categories and repeatable versions", () => {
  const asia = {
    ...definition,
    id: "asia",
    select: { source: "fixture-source", where: { continents: ["Asia"] } },
  };
  const first = compile([definition, asia]).catalogue;
  assert.deepEqual(
    first.packs.map((pack) => pack.answers.map((answer) => answer.id)),
    [["country:kenya"], ["country:japan"]],
  );
  assert.equal(first.version, compile([definition, asia]).catalogue.version);
  assert.equal(first.sources.length, 1);
});

test("missing, unexpectedly small, and unexpectedly large source sets cannot compile", () => {
  assert.throws(() => compileCatalogue([definition], [], new Map(), []), /Missing source/);
  assert.throws(() => compile([{ ...definition, minimumAnswers: 2 }]), /outside/);
  assert.throws(() => compile([{ ...definition, maximumAnswers: 0 }]), /outside/);
});

test("regional seed aliases attach to a source identity and preserve its provenance", () => {
  const seed = {
    id: "seed:kenya",
    label: "Republic of Kenya",
    aliases: ["Kenya", "Republic of Kenya"],
  };
  const { pack } = compilePack(definition, snapshot, [seed], []);
  assert.equal(pack.answers.length, 1);
  assert.equal(pack.answers[0].id, "country:kenya");
  assert.equal(pack.answers[0].evidence?.[0].sourceId, "fixture-source");
});

test("pending suggestions never affect gameplay and approved corrections require evidence", () => {
  const suggestion = proposeAnswer(
    {
      categoryId: "fixture",
      answer: "Example",
      evidence: "https://example.org/proof",
      reason: "Reviewed source",
    },
    new Set(["fixture"]),
  );
  assert.equal(suggestion.status, "pending");
  assert.equal(compilePack(definition, snapshot, [], [suggestion]).pack.answers.length, 1);
  const approved = { ...suggestion, status: "approved" as const };
  const corrected = compilePack(definition, snapshot, [], [approved]).pack;
  assert.equal(corrected.answers.length, 2);
  assert.equal(corrected.answers[1].evidence?.[0].url, suggestion.evidence);
  assert.throws(
    () => compilePack(definition, snapshot, [], [{ ...approved, evidence: "" }]),
    /needs evidence/,
  );
  assert.throws(
    () =>
      proposeAnswer(
        { categoryId: "fixture", answer: "Example", evidence: "javascript:alert(1)", reason: "" },
        new Set(["fixture"]),
      ),
    /HTTPS/,
  );
});

test("reviewed aliases share identity and reviewed exclusions remove a classification error", () => {
  const alias: Correction = {
    categoryId: "fixture",
    status: "approved",
    answer: { id: "country:kenya", label: "Kenya", aliases: ["Alternative name"] },
    evidence: "https://example.org/proof",
    reason: "Documented name",
  };
  const { pack } = compilePack(definition, snapshot, [], [alias]);
  const registry = new AnswerRegistry();
  registry.register(pack);
  assert.equal(registry.find("fixture", "Alternative name")?.id, "country:kenya");
  const exclude = { ...alias, action: "exclude" as const };
  assert.throws(() => compilePack(definition, snapshot, [], [exclude]), /outside/);
});

test("failed coverage and large removals preserve the previously published catalogue", async () => {
  const directory = await mkdtemp(join(tmpdir(), "potato-publication-"));
  try {
    const output = pathToFileURL(join(directory, "catalogue.json"));
    const previous = compile().catalogue;
    await writeFile(output, JSON.stringify(previous));
    const invalid: CoverageCase = {
      categoryId: "fixture",
      answer: "Japan",
      expected: "accepted",
      difficulty: "obscure",
      evidence: "https://example.org/proof",
    };
    await assert.rejects(
      publishCatalogue(output, previous, previous, [invalid]),
      /Coverage checks failed/,
    );
    assert.deepEqual(JSON.parse(await readFile(output, "utf8")), previous);
    const changed = structuredClone(previous);
    changed.packs[0].answers[0].id = "replacement";
    await assert.rejects(publishCatalogue(output, previous, changed, []), /Large removals/);
    await assert.rejects(
      publishCatalogue(output, previous, { ...previous, packs: [] }, []),
      /Large removals/,
    );
    assert.deepEqual(JSON.parse(await readFile(output, "utf8")), previous);
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("the benchmark cannot silently omit a category or its difficult cases", () => {
  assert.throws(() => requireBenchmark([definition], []), /missing common/);
  const fixture: CoverageCase = {
    categoryId: "fixture",
    answer: "Kenya",
    expected: "accepted",
    difficulty: "common",
    evidence: "https://example.org/proof",
  };
  assert.throws(() => requireBenchmark([definition], [fixture]), /missing obscure/);
  assert.throws(
    () => checkCoverage(compile().catalogue.packs, [{ ...fixture, categoryId: "missing" }]),
    /Unknown fixture category/,
  );
});

test("source throttling retries are bounded and respect Retry-After", async () => {
  let calls = 0;
  const fetcher = (async () => {
    calls += 1;
    return calls === 1
      ? new Response("busy", { status: 429, headers: { "Retry-After": "0" } })
      : new Response("ready");
  }) as typeof fetch;
  assert.equal(await fetchSourceText("https://example.org/source", fetcher), "ready");
  assert.equal(calls, 2);
  const unavailable = (async () =>
    new Response("busy", { status: 429, headers: { "Retry-After": "300" } })) as typeof fetch;
  await assert.rejects(
    fetchSourceText("https://example.org/source", unavailable),
    /longer retry interval/,
  );
});

test("a corrupted or unsafe snapshot lock is rejected before publication", async () => {
  const directory = await mkdtemp(join(tmpdir(), "potato-snapshot-"));
  const root = pathToFileURL(directory + "/");
  try {
    await mkdir(new URL("sources", root));
    await writeFile(new URL("sources/test.json.gz", root), gzipSync(JSON.stringify(snapshot)));
    const lock = {
      schemaVersion: 1,
      sources: [{ id: "fixture-source", file: "sources/test.json.gz", sha256: "wrong" }],
    };
    await writeFile(new URL("sources.lock.json", root), JSON.stringify(lock));
    await assert.rejects(loadSnapshots(root), /checksum mismatch/);
    lock.sources[0].file = "../outside.json.gz";
    await writeFile(new URL("sources.lock.json", root), JSON.stringify(lock));
    await assert.rejects(loadSnapshots(root), /Unsafe snapshot path/);
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("imports preserve language-neutral names and symbols without a popularity cutoff", () => {
  const collection = wikidataCollections.find((item) => item.id === "elements")!;
  const item = { value: "http://www.wikidata.org/entity/Q556" };
  const records = parseWikidata(
    [
      {
        item,
        label: { value: "Hydrogenium", "xml:lang": "mul" },
        alias: { value: "Neutral alias", "xml:lang": "mul" },
        symbol: { value: "H" },
      },
      { item, label: { value: "hydrogen", "xml:lang": "en" } },
      {
        item: { value: "http://www.wikidata.org/entity/Q1" },
        label: { value: "Non-English", "xml:lang": "de" },
      },
    ],
    collection,
  );
  assert.equal(records.length, 1);
  assert.equal(records[0].label, "hydrogen");
  assert.ok(records[0].aliases.includes("Neutral alias"));
  assert.deepEqual(records[0].symbols, ["H"]);
  assert.doesNotMatch(wikidataQuery(collection), /LIMIT|sitelinks/i);
});

test("malformed responses, incomplete imports and changed NASA tables fail closed", async () => {
  const collection = wikidataCollections[0];
  const malformed = (async () => new Response("{}")) as typeof fetch;
  const incomplete = (async () =>
    new Response(JSON.stringify({ results: { bindings: [] } }))) as typeof fetch;
  await assert.rejects(fetchWikidata(collection, malformed), /Invalid Wikidata response/);
  await assert.rejects(fetchWikidata(collection, incomplete), /incomplete import/);
  assert.throws(() => parseConstellations("<table><tr><td>Orion</td></tr></table>"), /expected 88/);
});

test("published packs pass independent common, obscure and boundary cases for all ten categories", async () => {
  const root = new URL("../", import.meta.url);
  const catalogue = JSON.parse(
    await readFile(new URL("server/answers/data/catalogue.json", root), "utf8"),
  ) as CompiledCatalogue;
  const fixtures = JSON.parse(
    await readFile(new URL("content/fixtures.json", root), "utf8"),
  ) as CoverageCase[];
  assert.equal(catalogue.packs.length, 10);
  for (const pack of catalogue.packs) {
    const cases = fixtures.filter((fixture) => fixture.categoryId === pack.categoryId);
    assert.deepEqual(
      new Set(cases.map((fixture) => fixture.difficulty)),
      new Set(["common", "obscure", "boundary"]),
    );
    assert.ok(pack.answers.every((answer) => answer.id && answer.evidence?.length));
    assert.match(pack.version, /^[a-f0-9]{64}$/);
  }
  assert.deepEqual(
    checkCoverage(catalogue.packs, fixtures).filter((fixture) => !fixture.passed),
    [],
  );
});
