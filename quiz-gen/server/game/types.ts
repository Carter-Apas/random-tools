export type QuizQuestion = {
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
};

export type Quiz = {
  title: string;
  questions: QuizQuestion[];
};

export type LobbyStatus =
  | "collecting"
  | "ready"
  | "question_live"
  | "question_result"
  | "leaderboard"
  | "finished";

export type Player = {
  id: string;
  nickname: string;
  socketId: string;
  score: number;
  isConnected: boolean;
};

export type SubmittedAnswer = {
  playerId: string;
  answerIndex: number;
  submittedAt: number;
  isCorrect: boolean;
  scoreAwarded: number;
};

export type Lobby = {
  code: string;
  hostSocketId: string;
  topic: string;
  questionCount: number;
  status: LobbyStatus;
  quiz: Quiz | null;
  players: Player[];
  currentQuestionIndex: number;
  currentQuestionStartedAt: number | null;
  currentQuestionEndsAt: number | null;
  phaseStartedAt: number | null;
  phaseEndsAt: number | null;
  answers: Record<number, Record<string, SubmittedAnswer>>;
};
