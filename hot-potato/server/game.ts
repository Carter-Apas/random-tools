import { randomInt, randomUUID } from "node:crypto";

import { categories, findAnswer } from "./categories.js";
import type { Category } from "./categories.js";

import { paces, wrongAnswerPenaltyMs } from "../shared/types.js";
import type { Pace, Player, Profile, RoomView } from "../shared/types.js";
export const travelMs = 1200;
export const recoveryMs = 2000;

export interface Member extends Player {
  token: string;
  disconnectedAt: number | null;
}

export interface Room extends Omit<RoomView, "players" | "serverTime" | "category"> {
  players: Member[];
  usedIds: string[];
  category: Category | null;
  deck: Category[];
  readyAt: number;
  botAt: number;
  updatedAt: number;
}

export const gameError: (message: string) => never = (message) => {
  throw new Error(message);
};

export const addEvent = (
  room: Room,
  kind: RoomView["events"][number]["kind"],
  text: string,
): void => {
  room.events.push({ id: (room.events.at(-1)?.id ?? 0) + 1, kind, text });
  room.events = room.events.slice(-8);
};

export const makeMember = (profile: Profile, token: string, bot = false): Member => ({
  id: randomUUID(),
  token,
  name: profile.name,
  avatar: profile.avatar,
  bot,
  hearts: 3,
  connected: true,
  disconnectedAt: null,
});

export const makeRoom = (code: string, host: Member, pace: Pace, now: number): Room => ({
  code,
  hostId: host.id,
  players: [host],
  status: "lobby",
  phase: "answering",
  pace,
  round: 0,
  turn: 0,
  activeId: null,
  winnerId: null,
  category: null,
  deck: [],
  used: [],
  usedIds: [],
  categoryGoal: 0,
  deadline: 0,
  turnDurationMs: 0,
  turnStartedAt: 0,
  draft: "",
  penaltyMs: 0,
  move: null,
  events: [],
  readyAt: 0,
  botAt: 0,
  updatedAt: now,
});

export const publicRoom = (room: Room, now: number): RoomView => ({
  code: room.code,
  hostId: room.hostId,
  status: room.status,
  phase: room.phase,
  pace: room.pace,
  round: room.round,
  turn: room.turn,
  activeId: room.activeId,
  winnerId: room.winnerId,
  used: [...room.used],
  categoryGoal: room.categoryGoal,
  deadline: room.deadline,
  turnDurationMs: room.turnDurationMs,
  turnStartedAt: room.turnStartedAt,
  penaltyMs: room.penaltyMs,
  draft: room.status === "playing" && room.phase === "answering" ? room.draft : "",
  move: room.move,
  events: [...room.events],
  players: room.players.map(({ token: _token, disconnectedAt: _at, ...player }) => player),
  category: room.category && {
    id: room.category.id,
    name: room.category.name,
    prompt: room.category.prompt,
    hint: room.category.hint,
    vegetable: room.category.vegetable,
    total: room.category.answers.length,
  },
  serverTime: now,
});

const shuffledCategories = (): Category[] => {
  const deck = [...categories];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const changeCategory = (room: Room): void => {
  if (!room.deck.length) room.deck = shuffledCategories();
  let index = room.category
    ? room.deck.findIndex((item) => item.vegetable !== room.category?.vegetable)
    : room.deck.findIndex((item) => item.vegetable === "potato");
  if (index < 0) {
    room.deck = [...categories].filter((item) => item.vegetable !== room.category?.vegetable);
    index = randomInt(room.deck.length);
  }
  room.category = room.deck.splice(index, 1)[0];
  room.used = [];
  room.usedIds = [];
  room.categoryGoal = Math.min(6, room.category.answers.length);
};

export const passTo = (room: Room, player: Member, now: number, from: string | null): void => {
  room.activeId = player.id;
  room.turn += 1;
  room.phase = "passing";
  room.readyAt = now + travelMs;
  room.move = { from, to: player.id, at: now, duration: travelMs };
  const pace = paces[room.pace];
  room.turnDurationMs = randomInt(pace.min / 1000, pace.max / 1000 + 1) * 1000;
  room.turnStartedAt = room.readyAt;
  room.deadline = room.turnStartedAt + room.turnDurationMs;
  room.draft = "";
  room.penaltyMs = 0;
  room.botAt = room.readyAt + 2200 + randomInt(1800);
  room.updatedAt = now;
};

export const nextPlayer = (room: Room, from: string | null): Member | undefined => {
  const index = room.players.findIndex((player) => player.id === from);
  for (let step = 1; step <= room.players.length; step += 1) {
    const player = room.players[(index + step) % room.players.length];
    if (player.hearts > 0 && player.connected) return player;
  }
  return undefined;
};

export const finishIfWon = (room: Room): boolean => {
  const alive = room.players.filter((player) => player.hearts > 0);
  if (alive.length > 1) return false;
  room.status = "finished";
  room.winnerId = alive[0]?.id ?? null;
  room.activeId = null;
  room.draft = "";
  room.move = null;
  addEvent(
    room,
    "win",
    alive[0] ? `${alive[0].name} wins the harvest!` : "The garden is empty. Play again!",
  );
  return true;
};

export const startGame = (room: Room, now: number): void => {
  if (room.status === "playing") gameError("This round is already growing.");
  const connected = room.players.filter((player) => player.connected);
  if (connected.length < 2) gameError("Invite a friend or add a practice gardener first.");
  room.players = connected;
  for (const player of room.players) player.hearts = 3;
  room.status = "playing";
  room.round += 1;
  room.winnerId = null;
  room.deck = [];
  room.category = null;
  room.events = [];
  changeCategory(room);
  addEvent(room, "start", `Round ${room.round} is growing. Pass it clockwise!`);
  passTo(room, connected[0], now, null);
};

const charPlayer = (room: Room, now: number): void => {
  const player = room.players.find((item) => item.id === room.activeId);
  if (!player) return;
  player.hearts = Math.max(0, player.hearts - 1);
  room.phase = "charred";
  room.draft = "";
  room.readyAt = now + recoveryMs;
  room.move = null;
  room.updatedAt = now;
  addEvent(
    room,
    "burn",
    `${player.name} got roasted! ${player.hearts ? `${player.hearts} hearts left.` : "Out of the patch."}`,
  );
};

const rejectAnswer: (room: Room, now: number, message: string) => never = (room, now, message) => {
  room.penaltyMs += wrongAnswerPenaltyMs;
  room.deadline -= wrongAnswerPenaltyMs;
  if (room.deadline <= now) charPlayer(room, now);
  return gameError(message);
};

const validateTurn = (room: Room, id: string, turn: number, now: number): Category => {
  if (room.status !== "playing" || room.phase !== "answering")
    gameError("Wait for the vegetable to reach you.");
  if (room.deadline <= now) {
    charPlayer(room, now);
    gameError("Too hot! Your turn timer ran out.");
  }
  if (id !== room.activeId || turn !== room.turn) gameError("It's another gardener's turn.");
  return room.category ?? gameError("The next category is on its way.");
};

export const submitAnswer = (
  room: Room,
  id: string,
  raw: string,
  turn: number,
  now: number,
): string => {
  const category = validateTurn(room, id, turn, now);
  room.draft = raw.slice(0, 100);
  const answer = findAnswer(category, raw);
  if (!answer) rejectAnswer(room, now, "Wrong answer. 2 seconds lost — try again!");
  if (room.usedIds.includes(answer.id ?? answer.label))
    rejectAnswer(room, now, "Already picked! 2 seconds lost — try another.");
  room.used.push(answer.label);
  room.usedIds.push(answer.id ?? answer.label);
  addEvent(
    room,
    "answer",
    `${room.players.find((player) => player.id === id)?.name}: ${answer.label}`,
  );
  if (room.used.length >= room.categoryGoal) {
    changeCategory(room);
  }
  const next = nextPlayer(room, id);
  if (next) passTo(room, next, now, id);
  return answer.label;
};

const afterBurn = (room: Room, now: number): void => {
  const previous = room.activeId;
  const next = nextPlayer(room, previous);
  if (!next) return;
  changeCategory(room);
  passTo(room, next, now, previous);
};

const playBot = (room: Room, now: number): boolean => {
  const player = room.players.find((item) => item.id === room.activeId);
  if (!player?.bot || !room.category || now < room.botAt) return false;
  room.botAt = Number.POSITIVE_INFINITY;
  if (Math.random() < 0.3) return false;
  const answers = room.category.answers.filter((answer) => !room.used.includes(answer.label));
  const answer = answers[randomInt(answers.length)];
  submitAnswer(room, player.id, answer.label, room.turn, now);
  return true;
};

export const tickGame = (room: Room, now: number): boolean => {
  if (room.status !== "playing") return false;
  if (room.phase === "charred") {
    if (now < room.readyAt) return false;
    if (!finishIfWon(room)) afterBurn(room, now);
    return true;
  }
  if (now >= room.deadline) {
    charPlayer(room, now);
    return true;
  }
  if (room.phase === "passing" && now >= room.readyAt) {
    room.phase = "answering";
    return true;
  }
  if (room.phase === "answering") return playBot(room, now);
  return false;
};

export const updateDraft = (
  room: Room,
  id: string,
  draft: string,
  turn: number,
  now: number,
): boolean => {
  if (room.status !== "playing" || room.phase !== "answering") return false;
  if (room.activeId !== id || room.turn !== turn || now >= room.deadline) return false;
  if (draft.length > 100 || room.draft === draft) return false;
  room.draft = draft;
  return true;
};
