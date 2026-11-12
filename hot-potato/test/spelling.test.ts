import assert from "node:assert/strict";
import { test } from "node:test";

import { categories, findAnswer } from "../server/categories.js";
import { AnswerRegistry } from "../server/answers/index.js";
import { editDistance } from "../server/answers/edit-distance.js";
import fixtures from "../content/fixtures.json" with { type: "json" };

test("bounded spelling distance handles missing, extra, substituted and transposed letters", () => {
  for (const [left, right] of [
    ["spagetti", "spaghetti"],
    ["mozarella", "mozzarella"],
    ["chedddar", "cheddar"],
    ["misnk", "minsk"],
    ["spoghetti", "spaghetti"],
  ]) {
    assert.equal(editDistance(left, right), 1);
    assert.equal(editDistance(right, left), 1);
  }
  assert.equal(editDistance("spagehtt", "spaghetti"), 2);
  assert.ok(editDistance("carrot", "spaghetti") > 2);
});

test("clear category typos resolve to the same identity as the correctly spelled answer", () => {
  for (const [categoryId, typo, correct] of [
    ["pasta", "spagetti", "spaghetti"],
    ["cheeses", "mozarella", "mozzarella"],
    ["cheeses", "chedddar", "cheddar"],
    ["cheeses", "ftea", "feta"],
    ["capitals", "misnk", "minsk"],
    ["genres", "jazzz", "jazz"],
    ["instruments", "nyckleharpa", "nyckelharpa"],
    ["units", "btye", "byte"],
  ]) {
    const category = categories.find((item) => item.id === categoryId)!;
    const expected = findAnswer(category, correct);
    assert.ok(expected, `${categoryId}: ${correct}`);
    assert.equal(findAnswer(category, typo)?.id, expected.id, `${categoryId}: ${typo}`);
  }
});

test("real words, short names and scientific notation do not get guessed into answers", () => {
  for (const [categoryId, wrong] of [
    ["genres", "mango"],
    ["capitals", "mink"],
    ["capitals", "minks"],
    ["seas", "black tea"],
    ["constellations", "little beer"],
    ["units", "m/S"],
    ["elements", "Ununennium"],
    ["cheeses", "fez"],
  ]) {
    assert.equal(
      findAnswer(
        categories.find((item) => item.id === categoryId)!,
        wrong,
      ),
      undefined,
      `${categoryId}: ${wrong}`,
    );
  }
});

test("ambiguous spellings reject instead of choosing a candidate or revealing alternatives", () => {
  const registry = new AnswerRegistry();
  registry.register({
    id: "fixture",
    categoryId: "fixture",
    answers: [
      { id: "a", label: "Alphaxa", aliases: ["Alphaxo"] },
      { id: "b", label: "Alphaxi", aliases: [] },
    ],
  });
  assert.equal(registry.correct("fixture", "alphaxu", new Set()), undefined);
  assert.equal(registry.correct("fixture", "alphaxxra", new Set()), undefined);
  registry.register({
    id: "fixture",
    categoryId: "fixture",
    answers: [{ id: "a", label: "Alphaxa", aliases: ["Alphaxo"] }],
  });
  assert.equal(registry.correct("fixture", "alphaxu", new Set())?.id, "a");
});

test("spelling tolerance preserves every independently reviewed invalid category boundary", () => {
  for (const fixture of fixtures) {
    if (fixture.expected !== "rejected") continue;
    const category = categories.find((item) => item.id === fixture.categoryId)!;
    assert.equal(
      findAnswer(category, fixture.answer),
      undefined,
      `${fixture.categoryId}: ${fixture.answer}`,
    );
  }
});
