import assert from "node:assert/strict";
import { test } from "node:test";

import { AnswerRegistry } from "../server/answers/index.js";
import { questions, findAnswer } from "../server/questions.js";

const unitQuestions = questions.filter((question) => question.datasetId === "units");

const findUnit = (word: string) => {
  for (const question of unitQuestions) {
    const answer = findAnswer(question, word);
    if (answer) return answer;
  }
  return undefined;
};

test("British and American singulars and plurals map to identical entities", () => {
  for (const words of [
    ["metre", "meter", "metres", "meters"],
    ["litre", "liter", "litres", "liters"],
    ["millilitre", "milliliter", "millilitres", "milliliters"],
    ["kilometre", "kilometer", "kilometres", "kilometers"],
  ]) {
    const answers = words.map(findUnit);
    assert.ok(answers[0]);
    assert.ok(
      answers.every((answer) => answer?.id === answers[0]?.id),
      words.join(", "),
    );
  }
});

test("the unit provider includes obscure source-backed units and current SI prefix combinations", () => {
  assert.ok(new Set(unitQuestions.flatMap((question) => question.answers)).size > 400);
  for (const word of [
    "furlongs",
    "fathoms",
    "barns",
    "ronnametres",
    "quectometres",
    "quettagrams",
  ]) {
    const answer = findUnit(word);
    assert.ok(answer, word);
    assert.ok(answer.source, word);
  }
});

test("scientific symbols keep case and meaning", () => {
  const milli = findUnit("ms");
  const mega = findUnit("Ms");
  assert.ok(milli);
  assert.ok(mega);
  assert.notEqual(milli.id, mega.id);
  assert.equal(findUnit("m")?.id, findUnit("meters")?.id);
  assert.equal(findUnit("m/s")?.id, findUnit("meters per second")?.id);
});

test("the registry refuses ambiguous aliases and arbitrary fuzzy guesses", () => {
  const registry = new AnswerRegistry();
  registry.register({
    id: "fixture",
    questionId: "fixture",
    answers: [
      { id: "one", label: "First", aliases: ["shared"] },
      { id: "two", label: "Second", aliases: ["shared"] },
    ],
  });
  assert.equal(registry.find("fixture", "shared"), undefined);
  assert.equal(registry.find("fixture", "firs"), undefined);
  assert.equal(registry.find("fixture", "First")?.id, "one");
});

test("plural handling is question-aware and never changes proper names", () => {
  const herbs = questions.find((question) => question.id === "herbs")!;
  const rivers = questions.find((question) => question.id === "rivers")!;
  assert.equal(findAnswer(herbs, "bay leaves")?.id, findAnswer(herbs, "bay leaf")?.id);
  assert.equal(findAnswer(rivers, "Niles"), undefined);
  assert.equal(findAnswer(rivers, "Nile River")?.id, findAnswer(rivers, "Nile")?.id);
});

test("optional prefixes and suffixes resolve to the same identity", () => {
  const volcanoes = questions.find((question) => question.id === "volcanoes")!;
  const etna = findAnswer(volcanoes, "Mount Etna");
  assert.ok(etna);
  for (const name of ["Etna", "Mt Etna", "Mt. Etna", "Etna volcano"])
    assert.equal(findAnswer(volcanoes, name)?.id, etna.id);
  assert.equal(findAnswer(volcanoes, "Mount"), undefined);
  assert.equal(findAnswer(volcanoes, "Mont Blanc"), undefined);
});

test("shared surnames use up every matching office holder", () => {
  const presidents = questions.find((question) => question.id === "us-presidents")!;
  assert.equal(findAnswer(presidents, "Lincoln")?.label, "Abraham Lincoln");
  assert.equal(findAnswer(presidents, "Roosevelt")?.consumes?.length, 2);
  assert.equal(findAnswer(presidents, "Hillary Clinton"), undefined);
});
