import assert from "node:assert/strict";
import { test } from "node:test";

import { compileDataset } from "../content/datasets.js";
import { compileCatalogue, compilePack } from "../content/compile.js";
import { readCatalogue, storeCatalogue } from "../server/answers/catalogue-format.js";
import type {
  DatasetDefinition,
  QuestionDefinition,
  SourceSnapshot,
} from "../server/answers/catalogue-types.js";
import { findAnswer, questions } from "../server/questions.js";
import { changeQuestion, makeMember, makeRoom, startGame } from "../server/game.js";

const source: SourceSnapshot = {
  schemaVersion: 1,
  source: {
    id: "source",
    name: "Source",
    url: "https://example.org/source",
    revision: "v1",
    sha256: "a".repeat(64),
    license: "CC0-1.0",
  },
  records: [
    {
      id: "tomato",
      label: "Tomato",
      aliases: ["tomato"],
      facts: { kind: ["fruit"], colour: ["red"] },
    },
    {
      id: "apple",
      label: "Apple",
      aliases: ["apple"],
      facts: { kind: ["fruit"], colour: ["green"] },
    },
  ],
};
const dataset: DatasetDefinition = {
  id: "food",
  name: "Food",
  description: "Shared food records",
  imports: [{ source: "source" }],
  minimumRecords: 2,
  maximumRecords: 10,
  normalization: { plurals: true, ambiguousNames: "consume-all" },
};
const question: QuestionDefinition = {
  id: "fruit",
  datasetId: "food",
  name: "Fruit",
  prompt: "Name a fruit",
  hint: "Fixture",
  vegetable: "tomato",
  select: { where: { kind: ["fruit"] } },
  normalization: dataset.normalization,
  minimumAnswers: 1,
  maximumAnswers: 10,
};

const build = () =>
  compileDataset(
    dataset,
    [source],
    [
      {
        datasetId: "food",
        id: "tomato",
        label: "Tomato",
        aliases: ["love apple"],
        facts: { kind: ["vegetable"] },
      },
      {
        datasetId: "food",
        id: "carrot",
        label: "Carrot",
        aliases: ["carrot"],
        facts: { kind: ["vegetable"], colour: ["orange"] },
      },
    ],
    {},
    [],
    [],
  );

test("dataset imports and curated properties share identities across independently filtered questions", () => {
  const snapshot = build();
  assert.equal(snapshot.records.length, 3);
  assert.deepEqual(source.records[0].facts.kind, ["fruit"]);
  const vegetables = { ...question, id: "vegetables", select: { where: { kind: ["vegetable"] } } };
  const fruit = compilePack(question, snapshot).pack;
  const veg = compilePack(vegetables, snapshot).pack;
  assert.deepEqual(
    fruit.answers.map((answer) => answer.id),
    ["tomato", "apple"],
  );
  assert.deepEqual(
    veg.answers.map((answer) => answer.id),
    ["tomato", "carrot"],
  );
  assert.ok(fruit.answers[0].aliases.includes("love apple"));
  assert.ok(veg.answers[0].aliases.includes("love apple"));
  assert.throws(
    () => compilePack({ ...question, select: { where: { coluor: ["red"] } } }, snapshot),
    /unknown.*filter/,
  );
  assert.deepEqual(
    compilePack(
      { ...question, select: { where: { kind: ["fruit", "vegetable"], colour: ["red"] } } },
      snapshot,
    ).pack.answers.map((answer) => answer.id),
    ["tomato"],
  );
});

test("an approved dataset addition cannot bypass a question's membership filter", () => {
  const snapshot = compileDataset(
    dataset,
    [source],
    [],
    {},
    [
      {
        datasetId: "food",
        status: "approved",
        answer: { id: "onion", label: "Onion", aliases: [], facts: { kind: ["vegetable"] } },
        evidence: "https://example.org/onion",
        reason: "Fixture vegetable",
      },
    ],
    [],
  );
  assert.equal(snapshot.records.length, 3);
  assert.equal(
    compilePack(question, snapshot).pack.answers.some((answer) => answer.id === "onion"),
    false,
  );
  assert.equal(
    compilePack(
      { ...question, id: "vegetables", select: { where: { kind: ["vegetable"] } } },
      snapshot,
    ).pack.answers[0].id,
    "onion",
  );
  assert.throws(() => compileDataset(dataset, [], [], {}, [], []), /Missing dataset source/);
  assert.throws(
    () =>
      compileDataset(
        dataset,
        [source],
        [],
        {},
        [],
        [],
        [{ datasetId: "food", recordId: "missing", facts: { kind: ["fruit"] } }],
      ),
    /Unknown tagged identity/,
  );
});

test("equal names from different source identities remain separate dataset entities", () => {
  const snapshot = compileDataset(
    dataset,
    [source],
    [
      {
        datasetId: "food",
        id: "another-tomato",
        label: "Tomato",
        aliases: [],
        facts: { kind: ["fruit"] },
      },
    ],
    {},
    [],
    [],
  );
  assert.equal(snapshot.records.filter((record) => record.label === "Tomato").length, 2);
});

test("stored questions reference shared dataset entities and invalid references fail closed", () => {
  const snapshot = build();
  const vegetables = { ...question, id: "vegetables", select: { where: { kind: ["vegetable"] } } };
  const { catalogue } = compileCatalogue([question, vegetables], [snapshot]);
  const stored = storeCatalogue(catalogue);
  assert.equal(stored.entities.food.length, 3);
  assert.equal("answers" in stored.packs[0], false);
  const restored = readCatalogue(JSON.parse(JSON.stringify(stored)));
  assert.equal(restored.packs[0].answers[0], restored.packs[1].answers[0]);
  assert.deepEqual(restored, catalogue);
  const invalid = structuredClone(stored);
  invalid.packs[0].answerIds.push("missing");
  assert.throws(() => readCatalogue(invalid), /Unknown dataset identity/);
  assert.throws(() => readCatalogue({ ...stored, schemaVersion: 2 }), /Unsupported/);
});

test("the published questions share food and animal identities while retaining their boundaries", () => {
  const get = (id: string) => questions.find((question) => question.id === id)!;

  assert.equal(get("fruit").datasetId, get("vegetables").datasetId);
  assert.equal(
    findAnswer(get("produce"), "tomato")?.id,
    findAnswer(get("vegetables"), "tomato")?.id,
  );
  assert.equal(findAnswer(get("pets"), "horse")?.id, findAnswer(get("farm"), "horse")?.id);
  assert.equal(findAnswer(get("animals"), "kea")?.id, findAnswer(get("nzbirds"), "kea")?.id);
  assert.equal(findAnswer(get("nzbirds"), "dog"), undefined);
  assert.equal(findAnswer(get("fruit"), "carrot"), undefined);
  assert.equal(get("trees").datasetId, get("flowers").datasetId);
  assert.equal(get("europe").datasetId, get("capitals-world").datasetId);
});

const roomFixture = () => {
  const host = makeMember({ name: "Host", avatar: "male" }, "host");
  const room = makeRoom("CHECK", host, "classic", 0);
  room.players.push(makeMember({ name: "Friend", avatar: "female" }, "friend"));
  return room;
};

test("the opening deck visits each dataset before drawing its next question", () => {
  const room = roomFixture();
  startGame(room, 0);
  const datasets = new Set(questions.map((question) => question.datasetId));
  const opening = [room.question!, ...room.deck].slice(0, datasets.size);
  assert.equal(new Set(opening.map((question) => question.datasetId)).size, datasets.size);
});

test("dataset changes take priority over vegetables and retain that preference on rematches", () => {
  const room = roomFixture();
  const previous = questions.find((question) => question.id === "units")!;
  const sameDataset = {
    ...questions.find((question) => question.id === "units-length")!,
    vegetable: "carrot" as const,
  };
  const differentDataset = {
    ...questions.find((question) => question.id === "fruit")!,
    vegetable: previous.vegetable,
  };
  room.question = previous;
  room.deck = [sameDataset, differentDataset];
  changeQuestion(room);
  assert.equal(room.question.id, differentDataset.id);
  assert.notEqual(room.question.vegetable, previous.vegetable);
  room.question = previous;
  room.deck = [sameDataset, differentDataset];
  room.status = "finished";
  startGame(room, 0);
  assert.equal(room.question.id, differentDataset.id);
});

test("classification refreshes enrich current identities without restoring removed records or old aliases", () => {
  const classifications: SourceSnapshot = {
    ...source,
    source: { ...source.source, id: "classifications" },
    records: [
      {
        id: "tomato",
        label: "Old tomato name",
        aliases: ["outdated alias"],
        facts: { season: ["summer"] },
      },
      { id: "removed", label: "Removed record", aliases: [], facts: { season: ["summer"] } },
    ],
  };
  const snapshot = compileDataset(
    { ...dataset, imports: [{ source: "source" }, { source: "classifications", mode: "enrich" }] },
    [source, classifications],
    [],
    {},
    [],
    [],
  );
  assert.equal(snapshot.records.length, 2);
  assert.equal(snapshot.records[0].label, "Tomato");
  assert.deepEqual(snapshot.records[0].facts.season, ["summer"]);
  assert.equal(snapshot.records[0].aliases.includes("outdated alias"), false);
  assert.equal(
    snapshot.records.some((record) => record.id === "removed"),
    false,
  );
});
