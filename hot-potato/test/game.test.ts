import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import { questions, findAnswer, normalize } from "../server/questions.js";
import {
  changeQuestion,
  publicRoom,
  startGame,
  submitAnswer,
  tickGame,
  updateDraft,
} from "../server/game.js";
import { heatStage, paces } from "../shared/types.js";
import { parsePace, parseProfile, Rooms } from "../server/rooms.js";

const setup = (count = 3) => {
  const store = new Rooms();
  const tokens = Array.from({ length: count }, () => randomUUID());
  const room = store.create(tokens[0], { name: "Host", avatar: "male" }, "classic", 1000);
  for (let i = 1; i < count; i += 1)
    store.join(tokens[i], room.code, { name: `Friend ${i}`, avatar: "female" }, 1000);
  startGame(room, 1000);
  tickGame(room, room.readyAt);
  return { store, tokens, room };
};

test("question aliases resolve to their identity or an explicit group of valid identities", () => {
  for (const question of questions) {
    if (question.id === "units" || question.datasetId === "units") continue;
    const aliases = new Set<string>();
    for (const answer of question.answers) {
      assert.ok(answer.label.length);
      for (const alias of answer.aliases) {
        if (question.normalization?.ambiguousNames !== "consume-all")
          assert.equal(aliases.has(alias), false, `${question.id}: duplicate alias ${alias}`);
        aliases.add(alias);
        const resolved = findAnswer(question, alias);
        assert.ok(resolved, `${question.id}: ${alias}`);
        assert.ok(resolved.id === answer.id || resolved.consumes?.includes(answer.id!));
      }
    }
  }
  assert.equal(normalize("  Pōhutukawa!  "), "pohutukawa");
});

test("valid answers pass clockwise and every recipient receives an independent turn timer", () => {
  const { room } = setup();
  const deadline = room.deadline;
  const first = room.players[0];
  const answer = room.question!.answers[0].label;
  const questionId = room.question!.id;
  submitAnswer(room, first.id, answer.toUpperCase(), room.turn, 2500);
  assert.deepEqual(publicRoom(room, 2500).events.at(-1)?.acceptedAnswer, {
    playerId: first.id,
    label: answer,
    questionId,
    at: 2500,
  });
  assert.equal(room.activeId, room.players[1].id);
  assert.equal(room.phase, "passing");
  assert.equal(room.move?.from, first.id);
  assert.notEqual(room.deadline, deadline);
  assert.equal(room.turnStartedAt, room.readyAt);
  assert.equal(room.deadline - room.readyAt, room.turnDurationMs);
  assert.ok(room.turnDurationMs >= paces.classic.min);
  assert.ok(room.turnDurationMs <= paces.classic.max);
  tickGame(room, room.readyAt);
  assert.equal(room.phase, "answering");
  assert.throws(
    () => submitAnswer(room, room.activeId!, answer, room.turn, 4000),
    /Already picked/,
  );
  assert.deepEqual(room.used, [answer]);
  assert.equal(room.events.filter((event) => event.acceptedAnswer).length, 1);
});

test("wrong, stale, and out-of-turn answers never pass or consume a heart", () => {
  const { room } = setup();
  const turn = room.turn;
  assert.throws(
    () => submitAnswer(room, room.players[1].id, "Mars", turn, 2500),
    /another gardener/,
  );
  assert.throws(
    () => submitAnswer(room, room.activeId!, "Mars", turn - 1, 2500),
    /another gardener/,
  );
  assert.throws(
    () => submitAnswer(room, room.activeId!, "not an answer", turn, 2500),
    /Wrong answer/,
  );
  assert.equal(room.turn, turn);
  assert.equal(room.players[0].hearts, 3);
});

test("a tiny question exhausts, changes vegetable, and resets accepted answers", () => {
  const { room } = setup();
  room.question = {
    ...questions.find((question) => question.id === "cheeses")!,
    id: "test-small",
    vegetable: "turnip",
    answers: questions.find((question) => question.id === "cheeses")!.answers.slice(0, 2),
  };
  room.questionGoal = 2;
  submitAnswer(room, room.activeId!, "Cheddar", room.turn, 2500);
  tickGame(room, room.readyAt);
  submitAnswer(room, room.activeId!, "Brie", room.turn, room.readyAt + 100);
  assert.notEqual(room.question.id, "test-small");
  assert.notEqual(room.question.vegetable, "turnip");
  assert.equal(room.used.length, 0);
});

test("a streak rotates a large question while preserving unused answers for another visit", () => {
  const { room } = setup();
  room.question = questions.find((question) => question.id === "fruit")!;
  room.questionGoal = 6;
  const answers = room.question.answers.slice(0, 6);
  for (const answer of answers) {
    tickGame(room, room.readyAt);
    submitAnswer(room, room.activeId!, answer.label, room.turn, room.readyAt + 100);
  }
  assert.notEqual(room.question.id, "fruit");
  assert.equal(room.used.length, 0);
});

test("late packets char the player before accepting an answer and cannot cost two hearts", () => {
  const { room } = setup();
  const answer = room.question!.answers[0].label;
  assert.throws(
    () => submitAnswer(room, room.activeId!, answer, room.turn, room.deadline),
    /turn timer ran out/,
  );
  assert.equal(room.players[0].hearts, 2);
  assert.equal(room.phase, "charred");
  tickGame(room, room.deadline + 100);
  assert.equal(room.players[0].hearts, 2);
  tickGame(room, room.readyAt);
  assert.equal(room.activeId, room.players[1].id);
  assert.equal(room.phase, "passing");
});

test("passing at the last millisecond cannot shorten the next player's timer", () => {
  const { room } = setup();
  const oldDeadline = room.deadline;
  submitAnswer(room, room.activeId!, room.question!.answers[0].label, room.turn, oldDeadline - 1);
  assert.equal(room.turnStartedAt, oldDeadline - 1 + 1200);
  assert.equal(room.deadline - room.turnStartedAt, room.turnDurationMs);
  assert.ok(room.turnDurationMs >= paces.classic.min);
  tickGame(room, room.readyAt - 1);
  assert.equal(room.phase, "passing");
  tickGame(room, room.readyAt);
  assert.equal(room.phase, "answering");
  assert.equal(room.players[1].hearts, 3);
});

test("a wrong answer leaves the deadline, heat and turn unchanged", () => {
  const { room } = setup();
  const deadline = room.deadline;
  assert.throws(
    () => submitAnswer(room, room.activeId!, "wrong", room.turn, room.turnStartedAt + 1000),
    /Wrong answer/,
  );
  assert.equal(room.deadline, deadline);
  assert.equal(room.penaltyMs, 0);
  assert.equal(
    heatStage(publicRoom(room, room.turnStartedAt + 1000), room.turnStartedAt + 1000),
    "cool",
  );
  assert.equal(room.draft, "wrong");
});

test("heat stages use percentages of this turn and reset after recovery", () => {
  const { room } = setup();

  const at = (ratio: number) => room.turnStartedAt + room.turnDurationMs * ratio;

  assert.equal(heatStage(publicRoom(room, at(0)), at(0.29)), "cool");
  assert.equal(heatStage(publicRoom(room, at(0)), at(0.3)), "warm");
  assert.equal(heatStage(publicRoom(room, at(0)), at(0.6)), "hands");
  assert.equal(heatStage(publicRoom(room, at(0)), at(0.82)), "body");
  tickGame(room, room.deadline);
  assert.equal(heatStage(publicRoom(room, room.deadline), room.deadline), "charred");
  tickGame(room, room.readyAt);
  assert.equal(heatStage(publicRoom(room, room.readyAt), room.readyAt), "cool");
});

test("typing is accepted only for the active turn, cleared on pass and hidden during travel", () => {
  const { room } = setup();
  assert.equal(updateDraft(room, room.players[1].id, "private prediction", room.turn, 2500), false);
  assert.equal(room.draft, "");
  assert.equal(updateDraft(room, room.activeId!, "hello", room.turn - 1, 2500), false);
  assert.equal(updateDraft(room, room.activeId!, "hello", room.turn, 2500), true);
  assert.equal(publicRoom(room, 2500).draft, "hello");
  assert.equal(updateDraft(room, room.activeId!, "x".repeat(101), room.turn, 2500), false);
  const previousId = room.activeId!;
  const previousTurn = room.turn;
  submitAnswer(room, previousId, room.question!.answers[0].label, room.turn, 2600);
  assert.equal(room.draft, "");
  assert.equal(publicRoom(room, 2600).draft, "");
  assert.equal(updateDraft(room, previousId, "late packet", previousTurn, 2700), false);
  tickGame(room, room.readyAt);
  assert.equal(updateDraft(room, room.activeId!, "too late", room.turn, room.deadline), false);
  assert.equal(
    updateDraft(room, room.activeId!, "next answer", room.turn, room.readyAt + 50),
    true,
  );
  tickGame(room, room.deadline);
  assert.equal(room.draft, "");
});

test("trivial calendar and short-list questions are removed", () => {
  for (const id of ["days", "months", "seasons", "rainbow", "suits", "planets", "islands"]) {
    assert.equal(
      questions.some((question) => question.id === id),
      false,
    );
  }
});

test("three heart losses eliminate a player, show the final charring, declare a winner and allow host rematch", () => {
  const { room, store, tokens } = setup(2);
  let safety = 0;
  while (room.status === "playing" && safety < 10) {
    tickGame(room, room.readyAt);
    tickGame(room, room.deadline);
    assert.equal(room.phase, "charred");
    tickGame(room, room.readyAt);
    safety += 1;
  }
  assert.equal(room.status, "finished");
  assert.equal(room.players.filter((player) => player.hearts > 0).length, 1);
  assert.equal(room.winnerId, room.players.find((player) => player.hearts > 0)?.id);
  assert.throws(() => store.host(tokens[1]), /Only the host/);
  startGame(store.host(tokens[0]), 200000);
  assert.equal(room.round, 2);
  assert.equal(room.status, "playing");
  assert.ok(room.players.every((player) => player.hearts === 3));
});

test("room snapshots exclude session tokens, answer banks, scheduling state and decks", () => {
  const { room, tokens } = setup();
  const view = publicRoom(room, 3000);
  const json = JSON.stringify(view);
  for (const token of tokens) assert.equal(json.includes(token), false);
  for (const key of ["answers", "aliases", "deck", "readyAt", "botAt", "disconnectedAt", "usedIds"])
    assert.equal(json.includes(`"${key}"`), false);
});

test("disconnect preserves seat, migrates host, reconnect restores hearts and grace expiry removes player", () => {
  const { room, store, tokens } = setup();
  room.players[0].hearts = 2;
  store.disconnect(tokens[0], 3000);
  assert.equal(room.hostId, room.players[1].id);
  assert.equal(store.reconnect(tokens[0]), room);
  assert.equal(room.players[0].hearts, 2);
  store.disconnect(tokens[0], 4000);
  store.tick(34000);
  assert.equal(room.players.length, 2);
  assert.equal(store.membership.has(tokens[0]), false);
});

test("departing current player passes to clockwise neighbour and leaving last human cleans bots", () => {
  const { room, store, tokens } = setup();
  const nextId = room.players[1].id;
  store.remove(tokens[0], 3000);
  assert.equal(room.activeId, nextId);
  assert.equal(room.hostId, nextId);
  store.remove(tokens[1], 3000);
  assert.equal(room.status, "finished");
  store.addBot(tokens[2]);
  store.remove(tokens[2], 3000);
  assert.equal(store.rooms.size, 0);
});

test("join bounds, duplicate names, input validation and room expiry", () => {
  const store = new Rooms();
  const token = randomUUID();
  const room = store.create(token, { name: "Host", avatar: "male" }, "classic", 0);
  assert.throws(
    () => store.join(randomUUID(), room.code, { name: "host", avatar: "male" }, 0),
    /name is taken/,
  );
  for (let i = 0; i < 7; i += 1) store.addBot(token);
  assert.throws(() => store.addBot(token), /full/);
  assert.throws(
    () => store.join(randomUUID(), room.code, { name: "Ninth", avatar: "male" }, 0),
    /eight/,
  );
  assert.throws(() => parseProfile({ name: "", avatar: "male" }), /name/);
  assert.throws(() => parseProfile({ name: "Me", avatar: "other" }), /Choose a gardener/);
  assert.throws(() => parsePace("nuclear"), /valid pace/);
  store.tick(3600001);
  assert.equal(store.rooms.size, 0);
  assert.equal(store.membership.size, 0);
});

test("a wrong answer near expiry costs no heart until the natural deadline", () => {
  const { room } = setup();
  const now = room.deadline - 1000;
  assert.throws(
    () => submitAnswer(room, room.activeId!, "nonsense", room.turn, now),
    /Wrong answer/,
  );
  assert.equal(room.phase, "answering");
  assert.equal(room.players[0].hearts, 3);
  tickGame(room, room.deadline);
  assert.equal(room.phase, "charred");
  assert.equal(room.players[0].hearts, 2);
  tickGame(room, room.deadline + 100);
  assert.equal(room.players[0].hearts, 2);
});

test("regional plurals cannot be used as separate answers", () => {
  const { room } = setup();
  room.question = questions.find((item) => item.id === "units")!;
  submitAnswer(room, room.activeId!, "liters", room.turn, 2500);
  tickGame(room, room.readyAt);
  const deadline = room.deadline;
  assert.throws(
    () => submitAnswer(room, room.activeId!, "litres", room.turn, room.readyAt + 20),
    /Already picked/,
  );
  assert.equal(room.used.length, 1);
  assert.equal(room.deadline, deadline);
});

test("every question can open a round regardless of its vegetable", () => {
  const { room } = setup();
  for (const question of questions) {
    room.question = null;
    room.deck = [question, ...questions.filter((other) => other.id !== question.id)];
    changeQuestion(room);
    assert.equal(room.question, question);
  }
});

test("the question deck visits the whole pool without repeats and changes vegetable every time", () => {
  const { room } = setup();
  const seen = new Set([room.question!.id]);
  for (let i = 1; i < questions.length; i += 1) {
    const previous = room.question!;
    changeQuestion(room);
    assert.equal(seen.has(room.question!.id), false);
    assert.notEqual(room.question!.vegetable, previous.vegetable);
    seen.add(room.question!.id);
  }
  assert.equal(seen.size, questions.length);
  assert.equal(room.deck.length, 0);
  const previous = room.question!;
  changeQuestion(room);
  assert.notEqual(room.question!.vegetable, previous.vegetable);
});

test("rematches preserve unused questions and prefer a different topic when available", () => {
  const { room } = setup();
  const units = questions.find((item) => item.id === "units")!;
  const length = questions.find((item) => item.id === "units-length")!;
  const fruit = questions.find((item) => item.id === "fruit")!;
  room.question = units;
  room.deck = [{ ...length, vegetable: "carrot" }, fruit];
  changeQuestion(room);
  assert.equal(room.question.id, "fruit");
  room.status = "finished";
  startGame(room, 200000);
  assert.equal(room.question!.id, "units-length");
  assert.equal(room.deck.length, 0);
});

test("a shared valid name passes once and consumes every matching identity without revealing candidates", () => {
  const { room } = setup();
  room.question = {
    id: "ambiguous-fixture",
    datasetId: "fixture",
    name: "Fixture",
    prompt: "Name a sea",
    hint: "Fixture",
    vegetable: "carrot",
    normalization: { ambiguousNames: "consume-all" },
    answers: [
      { id: "one", label: "First sea", aliases: ["shared sea"] },
      { id: "two", label: "Second sea", aliases: ["shared sea"] },
    ],
  };
  room.questionGoal = 6;
  assert.equal(submitAnswer(room, room.activeId!, "shared sea", room.turn, 2500), "shared sea");
  assert.deepEqual(room.usedIds, ["one", "two"]);
  assert.deepEqual(publicRoom(room, 2500).used, ["shared sea"]);
  tickGame(room, room.readyAt);
  assert.throws(
    () => submitAnswer(room, room.activeId!, "Second sea", room.turn, room.readyAt + 20),
    /Already picked/,
  );
});
