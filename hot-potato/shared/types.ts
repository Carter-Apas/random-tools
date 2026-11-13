export type Avatar = "male" | "female";

export type Pace = "gentle" | "classic" | "spicy";

export type Vegetable =
  "potato" | "carrot" | "beetroot" | "turnip" | "pumpkin" | "corn" | "aubergine" | "tomato";

export interface Player {
  id: string;
  name: string;
  avatar: Avatar;
  hearts: number;
  connected: boolean;
  bot: boolean;
}

export interface QuestionView {
  id: string;
  datasetId: string;
  name: string;
  prompt: string;
  hint: string;
  vegetable: Vegetable;
  total: number;
}

export interface GameEvent {
  id: number;
  kind: "start" | "answer" | "burn" | "leave" | "win";
  text: string;
  acceptedAnswer?: {
    playerId: string;
    label: string;
    questionId: string;
    at: number;
  };
}

export interface Move {
  from: string | null;
  to: string;
  at: number;
  duration: number;
}

export interface RoomView {
  code: string;
  hostId: string;
  players: Player[];
  status: "lobby" | "playing" | "finished";
  phase: "passing" | "answering" | "charred";
  pace: Pace;
  round: number;
  turn: number;
  activeId: string | null;
  winnerId: string | null;
  question: QuestionView | null;
  used: string[];
  questionGoal: number;
  deadline: number;
  turnDurationMs: number;
  turnStartedAt: number;
  draft: string;
  penaltyMs: number;
  move: Move | null;
  events: GameEvent[];
  serverTime: number;
}

export interface Profile {
  name: string;
  avatar: Avatar;
}

export interface Reply {
  ok: boolean;
  error?: string;
  room?: RoomView;
  playerId?: string;
}

export const paces: Record<Pace, { label: string; min: number; max: number }> = {
  gentle: { label: "Gentle", min: 8000, max: 12000 },
  classic: { label: "Classic", min: 5000, max: 8000 },
  spicy: { label: "Spicy", min: 3000, max: 5000 },
};

export interface TypingUpdate {
  playerId: string;
  turn: number;
  draft: string;
}

export type HeatStage = "cool" | "warm" | "hands" | "body" | "charred";

export const heatStage = (room: RoomView, now: number): HeatStage => {
  if (room.phase === "charred") return "charred";
  if (room.status !== "playing" || room.phase !== "answering") return "cool";
  const elapsed = (now - room.turnStartedAt + room.penaltyMs) / room.turnDurationMs;
  if (elapsed >= 0.82) return "body";
  if (elapsed >= 0.6) return "hands";
  if (elapsed >= 0.3) return "warm";
  return "cool";
};
