import assert from "node:assert/strict";
import { test } from "node:test";

import { AnswerRegistry } from "../server/answers/index.js";
import { categories, findAnswer } from "../server/categories.js";

const units = categories.find((category) => category.id === "units")!;

test("British and American singulars and plurals map to identical entities", () => {
  for (const words of [
    ["metre", "meter", "metres", "meters"],
    ["litre", "liter", "litres", "liters"],
    ["millilitre", "milliliter", "millilitres", "milliliters"],
    ["kilometre", "kilometer", "kilometres", "kilometers"],
  ]) {
    const answers = words.map((word) => findAnswer(units, word));
    assert.ok(answers[0]);
    assert.ok(
      answers.every((answer) => answer?.id === answers[0]?.id),
      words.join(", "),
    );
  }
});

test("the unit provider includes obscure source-backed units and current SI prefix combinations", () => {
  assert.ok(units.answers.length > 2700);
  for (const word of [
    "furlongs",
    "fathoms",
    "barns",
    "curies",
    "ronnametres",
    "quectometres",
    "quettagrams",
  ]) {
    const answer = findAnswer(units, word);
    assert.ok(answer, word);
    assert.ok(answer.source, word);
  }
  assert.equal(findAnswer(units, "mho")?.id, findAnswer(units, "siemens")?.id);
});

test("scientific symbols keep case and meaning", () => {
  const milli = findAnswer(units, "ms");
  const mega = findAnswer(units, "Ms");
  assert.ok(milli);
  assert.ok(mega);
  assert.notEqual(milli.id, mega.id);
  assert.equal(findAnswer(units, "m")?.id, findAnswer(units, "meters")?.id);
  assert.equal(findAnswer(units, "m/s")?.id, findAnswer(units, "meters per second")?.id);
});

test("the registry refuses ambiguous aliases and arbitrary fuzzy guesses", () => {
  const registry = new AnswerRegistry();
  registry.register({
    id: "fixture",
    categoryId: "fixture",
    answers: [
      { id: "one", label: "First", aliases: ["shared"] },
      { id: "two", label: "Second", aliases: ["shared"] },
    ],
  });
  assert.equal(registry.find("fixture", "shared"), undefined);
  assert.equal(registry.find("fixture", "firs"), undefined);
  assert.equal(registry.find("fixture", "First")?.id, "one");
});

test("plural handling is category-aware and never changes proper names", () => {
  const herbs = categories.find((category) => category.id === "herbs")!;
  const rivers = categories.find((category) => category.id === "rivers")!;
  assert.equal(findAnswer(herbs, "bay leaves")?.id, findAnswer(herbs, "bay leaf")?.id);
  assert.equal(findAnswer(rivers, "Niles"), undefined);
  assert.equal(findAnswer(rivers, "Nile River")?.id, findAnswer(rivers, "Nile")?.id);
});
