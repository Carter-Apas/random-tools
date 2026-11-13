import assert from "node:assert/strict";
import { test } from "node:test";

import { questions, findAnswer } from "../server/questions.js";
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

test("clear question typos resolve to the same identity as the correctly spelled answer", () => {
  for (const [questionId, typo, correct] of [
    ["pasta", "spagetti", "spaghetti"],
    ["cheeses", "mozarella", "mozzarella"],
    ["cheeses", "chedddar", "cheddar"],
    ["cheeses", "ftea", "feta"],
    ["capitals", "misnk", "minsk"],
    ["genres", "jazzz", "jazz"],
    ["instruments", "nyckleharpa", "nyckelharpa"],
    ["units", "btye", "byte"],
  ]) {
    const question = questions.find((item) => item.id === questionId)!;
    const expected = findAnswer(question, correct);
    assert.ok(expected, `${questionId}: ${correct}`);
    assert.equal(findAnswer(question, typo)?.id, expected.id, `${questionId}: ${typo}`);
  }
});

test("real words, short names and scientific notation do not get guessed into answers", () => {
  for (const [questionId, wrong] of [
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
        questions.find((item) => item.id === questionId)!,
        wrong,
      ),
      undefined,
      `${questionId}: ${wrong}`,
    );
  }
});

test("ambiguous spellings reject instead of choosing a candidate or revealing alternatives", () => {
  const registry = new AnswerRegistry();
  registry.register({
    id: "fixture",
    questionId: "fixture",
    answers: [
      { id: "a", label: "Alphaxa", aliases: ["Alphaxo"] },
      { id: "b", label: "Alphaxi", aliases: [] },
    ],
  });
  assert.equal(registry.correct("fixture", "alphaxu", new Set()), undefined);
  assert.equal(registry.correct("fixture", "alphaxxra", new Set()), undefined);
  registry.register({
    id: "fixture",
    questionId: "fixture",
    answers: [{ id: "a", label: "Alphaxa", aliases: ["Alphaxo"] }],
  });
  assert.equal(registry.correct("fixture", "alphaxu", new Set())?.id, "a");
});

test("spelling tolerance preserves every independently reviewed invalid question boundary", () => {
  for (const fixture of fixtures) {
    if (fixture.expected !== "rejected") continue;
    const question = questions.find((item) => item.id === fixture.questionId)!;
    assert.equal(
      findAnswer(question, fixture.answer),
      undefined,
      `${fixture.questionId}: ${fixture.answer}`,
    );
  }
});
