import type { LobbyStatus } from "../server/game/types.js";

export type SnapshotRole = "host" | { playerId: string };

export type LobbyPlayerView = {
  id: string;
  nickname: string;
  score: number;
  isConnected: boolean;
  rank: number;
  hasAnswered: boolean;
};

export type PlayerSelfView = {
  id: string;
  nickname: string;
  score: number;
  answerLocked: boolean;
  selectedAnswerIndex: number | null;
  lastScoreAwarded: number | null;
  answerWasCorrect: boolean | null;
};

export type LobbyQuestionView = {
  prompt: string;
  options: [string, string, string, string];
  startedAt: number | null;
  endsAt: number | null;
  correctIndex?: number;
  explanation?: string;
};

export type LobbySnapshot = {
  role: "host" | "player";
  code: string;
  topic: string;
  questionCount: number;
  quizTitle: string | null;
  status: LobbyStatus;
  players: LobbyPlayerView[];
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: LobbyQuestionView | null;
  phaseStartedAt: number | null;
  phaseEndsAt: number | null;
  me: PlayerSelfView | null;
};
