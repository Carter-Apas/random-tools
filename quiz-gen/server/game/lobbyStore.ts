import { randomUUID } from "node:crypto";
import { calculateScore } from "./scoring.js";
import { createRoomCode, normalizeRoomCode } from "./roomCode.js";
import type { Lobby, Player, Quiz, SubmittedAnswer } from "./types.js";
import type { LobbySnapshot, SnapshotRole } from "../../shared/lobby.js";
import { quizQuestionCountLimits } from "../../shared/quiz.js";

type CreateLobbyInput = {
  hostSocketId: string;
  topic: string;
  questionCount: number;
};

type AddPlayerInput = {
  code: string;
  socketId: string;
  nickname: string;
};

type StartQuestionInput = {
  code: string;
  questionIndex: number;
  startedAt: number;
  durationMs: number;
};

type SubmitAnswerInput = {
  code: string;
  socketId: string;
  answerIndex: number;
  submittedAt: number;
};

type FinalizeQuestionInput = {
  code: string;
  finalizedAt: number;
};

type CodeInput = { code: string };
type RemovePlayerInput = { code: string; playerId: string };

function rankPlayers(
  lobby: Lobby,
  currentQuestionAnswers: Record<string, SubmittedAnswer>,
) {
  return [...lobby.players]
    .sort(
      (left, right) =>
        right.score - left.score || left.nickname.localeCompare(right.nickname),
    )
    .map((player, index) => ({
      id: player.id,
      nickname: player.nickname,
      score: player.score,
      isConnected: player.isConnected,
      rank: index + 1,
      hasAnswered: Boolean(currentQuestionAnswers[player.id]),
    }));
}

function buildQuestionView(lobby: Lobby) {
  const question = lobby.quiz?.questions[lobby.currentQuestionIndex];
  if (
    !question ||
    ["collecting", "ready", "leaderboard", "finished"].includes(lobby.status)
  ) {
    return null;
  }

  const revealed = lobby.status !== "question_live";
  return {
    prompt: question.prompt,
    options: question.options,
    startedAt: lobby.currentQuestionStartedAt,
    endsAt: lobby.currentQuestionEndsAt,
    correctIndex: revealed ? question.correctIndex : undefined,
    explanation: revealed ? question.explanation : undefined,
  };
}

function buildSnapshot(lobby: Lobby, role: SnapshotRole): LobbySnapshot {
  const currentAnswers = lobby.answers[lobby.currentQuestionIndex] ?? {};
  const players = rankPlayers(lobby, currentAnswers);
  const playerId = typeof role === "string" ? null : role.playerId;
  const me = playerId
    ? (lobby.players.find((player) => player.id === playerId) ?? null)
    : null;
  const myAnswer = me ? (currentAnswers[me.id] ?? null) : null;

  return {
    role: typeof role === "string" ? role : "player",
    code: lobby.code,
    topic: lobby.topic,
    questionCount: lobby.questionCount,
    quizTitle: lobby.quiz?.title ?? null,
    status: lobby.status,
    players,
    currentQuestionIndex: lobby.currentQuestionIndex,
    totalQuestions: lobby.quiz?.questions.length ?? lobby.questionCount,
    currentQuestion: buildQuestionView(lobby),
    phaseStartedAt: lobby.phaseStartedAt,
    phaseEndsAt: lobby.phaseEndsAt,
    me: me
      ? {
          id: me.id,
          nickname: me.nickname,
          score: me.score,
          answerLocked: Boolean(myAnswer),
          selectedAnswerIndex: myAnswer?.answerIndex ?? null,
          lastScoreAwarded: myAnswer?.scoreAwarded ?? null,
          answerWasCorrect: myAnswer?.isCorrect ?? null,
        }
      : null,
  };
}

function requireLobby(map: Map<string, Lobby>, code: string) {
  const normalized = normalizeRoomCode(code);
  const lobby = map.get(normalized);

  if (!lobby) {
    throw new Error("Lobby not found");
  }

  return lobby;
}

function requireQuiz(lobby: Lobby): Quiz {
  if (!lobby.quiz) {
    throw new Error("Quiz has not been generated");
  }

  return lobby.quiz;
}

function requirePlayerBySocket(lobby: Lobby, socketId: string): Player {
  const player = lobby.players.find(
    (entry) => entry.socketId === socketId && entry.isConnected,
  );

  if (!player) {
    throw new Error("Player not found");
  }

  return player;
}

function requireAnswerBucket(lobby: Lobby, questionIndex: number) {
  if (!lobby.answers[questionIndex]) {
    lobby.answers[questionIndex] = {};
  }

  return lobby.answers[questionIndex] as Record<string, SubmittedAnswer>;
}

export function createLobbyStore(random = Math.random) {
  const lobbies = new Map<string, Lobby>();

  return {
    createLobby(input: CreateLobbyInput) {
      if (
        !Number.isInteger(input.questionCount) ||
        input.questionCount < quizQuestionCountLimits.min ||
        input.questionCount > quizQuestionCountLimits.max
      ) {
        throw new Error(
          `Question count must be between ${quizQuestionCountLimits.min} and ${quizQuestionCountLimits.max}`,
        );
      }

      let code = "";

      do {
        code = createRoomCode(random);
      } while (lobbies.has(code));

      const lobby: Lobby = {
        code,
        hostSocketId: input.hostSocketId,
        topic: input.topic.trim(),
        questionCount: input.questionCount,
        status: "collecting",
        quiz: null,
        players: [],
        currentQuestionIndex: 0,
        currentQuestionStartedAt: null,
        currentQuestionEndsAt: null,
        phaseStartedAt: null,
        phaseEndsAt: null,
        answers: {},
      };

      lobbies.set(code, lobby);
      return lobby;
    },

    getLobby(code: string) {
      return requireLobby(lobbies, code);
    },

    findLobbyBySocketId(socketId: string) {
      for (const lobby of lobbies.values()) {
        if (
          lobby.hostSocketId === socketId ||
          lobby.players.some((player) => player.socketId === socketId)
        ) {
          return lobby;
        }
      }

      return null;
    },

    attachQuiz(code: string, quiz: Quiz) {
      const lobby = requireLobby(lobbies, code);
      lobby.quiz = quiz;
      lobby.status = "ready";
      lobby.currentQuestionIndex = 0;
      return lobby;
    },

    addPlayer(input: AddPlayerInput) {
      const lobby = requireLobby(lobbies, input.code);
      const nickname = input.nickname.trim();

      if (!nickname) {
        throw new Error("Nickname is required");
      }

      const existing = lobby.players.find(
        (player) => player.nickname.toLowerCase() === nickname.toLowerCase(),
      );

      if (existing?.isConnected) {
        throw new Error("Nickname is already in use");
      }

      if (existing) {
        existing.socketId = input.socketId;
        existing.isConnected = true;
        return existing;
      }

      const player: Player = {
        id: randomUUID(),
        nickname,
        socketId: input.socketId,
        score: 0,
        isConnected: true,
      };

      lobby.players.push(player);
      return player;
    },

    setPlayerConnection(socketId: string, isConnected: boolean) {
      for (const lobby of lobbies.values()) {
        const player = lobby.players.find(
          (entry) => entry.socketId === socketId,
        );
        if (player) {
          player.isConnected = isConnected;
          return lobby;
        }

        if (lobby.hostSocketId === socketId) {
          lobby.hostSocketId = isConnected ? socketId : "";
          return lobby;
        }
      }

      return null;
    },

    setHostSocket(code: string, socketId: string) {
      const lobby = requireLobby(lobbies, code);
      lobby.hostSocketId = socketId;
      return lobby;
    },

    startQuestion(input: StartQuestionInput) {
      const lobby = requireLobby(lobbies, input.code);
      const quiz = requireQuiz(lobby);

      if (!quiz.questions[input.questionIndex]) {
        throw new Error("Question does not exist");
      }

      lobby.currentQuestionIndex = input.questionIndex;
      lobby.currentQuestionStartedAt = input.startedAt;
      lobby.currentQuestionEndsAt = input.startedAt + input.durationMs;
      lobby.phaseStartedAt = null;
      lobby.phaseEndsAt = null;
      lobby.status = "question_live";
      requireAnswerBucket(lobby, input.questionIndex);

      return lobby;
    },

    submitAnswer(input: SubmitAnswerInput) {
      const lobby = requireLobby(lobbies, input.code);
      const quiz = requireQuiz(lobby);
      const player = requirePlayerBySocket(lobby, input.socketId);

      if (lobby.status !== "question_live") {
        throw new Error("Question is not live");
      }

      if (
        lobby.currentQuestionEndsAt !== null &&
        input.submittedAt > lobby.currentQuestionEndsAt
      ) {
        throw new Error("Question timer has ended");
      }

      const question = quiz.questions[lobby.currentQuestionIndex];
      if (!question) {
        throw new Error("Question does not exist");
      }

      const answers = requireAnswerBucket(lobby, lobby.currentQuestionIndex);
      if (answers[player.id]) {
        throw new Error("Player already answered");
      }

      const answer: SubmittedAnswer = {
        playerId: player.id,
        answerIndex: input.answerIndex,
        submittedAt: input.submittedAt,
        isCorrect: input.answerIndex === question.correctIndex,
        scoreAwarded: 0,
      };

      answers[player.id] = answer;
      return answer;
    },

    finalizeQuestion(input: FinalizeQuestionInput) {
      const lobby = requireLobby(lobbies, input.code);

      if (lobby.status !== "question_live") {
        throw new Error("Question is not live");
      }

      const questionIndex = lobby.currentQuestionIndex;
      const answers = requireAnswerBucket(lobby, questionIndex);
      const durationMs =
        lobby.currentQuestionStartedAt !== null &&
        lobby.currentQuestionEndsAt !== null
          ? lobby.currentQuestionEndsAt - lobby.currentQuestionStartedAt
          : 0;

      (Object.values(answers) as SubmittedAnswer[]).forEach(
        (answer: SubmittedAnswer) => {
          const player = lobby.players.find(
            (entry: Player) => entry.id === answer.playerId,
          );
          if (!player) {
            return;
          }

          const answeredAtMs =
            lobby.currentQuestionStartedAt === null
              ? input.finalizedAt
              : answer.submittedAt - lobby.currentQuestionStartedAt;
          answer.scoreAwarded = calculateScore({
            isCorrect: answer.isCorrect,
            answeredAtMs,
            durationMs,
          });
          player.score += answer.scoreAwarded;
        },
      );

      lobby.status = "question_result";
      return lobby;
    },

    showLeaderboard(
      input: CodeInput & { startedAt: number; durationMs: number },
    ) {
      const lobby = requireLobby(lobbies, input.code);
      lobby.status = "leaderboard";
      lobby.phaseStartedAt = input.startedAt;
      lobby.phaseEndsAt = input.startedAt + input.durationMs;
      return lobby;
    },

    finishGame(input: CodeInput) {
      const lobby = requireLobby(lobbies, input.code);
      lobby.status = "finished";
      lobby.phaseStartedAt = null;
      lobby.phaseEndsAt = null;
      return lobby;
    },

    restartLobby(input: CodeInput) {
      const lobby = requireLobby(lobbies, input.code);
      lobby.status = lobby.quiz ? "ready" : "collecting";
      lobby.players = lobby.players.map((player) => ({ ...player, score: 0 }));
      lobby.currentQuestionIndex = 0;
      lobby.currentQuestionStartedAt = null;
      lobby.currentQuestionEndsAt = null;
      lobby.phaseStartedAt = null;
      lobby.phaseEndsAt = null;
      lobby.answers = {};
      return lobby;
    },

    removePlayer(input: RemovePlayerInput) {
      const lobby = requireLobby(lobbies, input.code);
      lobby.players = lobby.players.filter(
        (player) => player.id !== input.playerId,
      );

      Object.values(lobby.answers).forEach((answerBucket) => {
        delete answerBucket[input.playerId];
      });

      return lobby;
    },

    getSnapshot(code: string, role: SnapshotRole) {
      const lobby = requireLobby(lobbies, code);
      return buildSnapshot(lobby, role);
    },
  };
}
