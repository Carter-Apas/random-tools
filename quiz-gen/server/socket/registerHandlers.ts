import type { ServerConfig } from "../config.js";
import type { createLobbyStore } from "../game/lobbyStore.js";
import type { createQuizGenerator } from "../game/openaiQuiz.js";
import type { Player } from "../game/types.js";
import { socketEvents } from "./events.js";

type LobbyStore = ReturnType<typeof createLobbyStore>;
type QuizGenerator = ReturnType<typeof createQuizGenerator>;
type TimeoutHandle = ReturnType<typeof setTimeout>;
const scheduledLobbyTimers = new Map<string, TimeoutHandle[]>();

type TimerApi = {
  setTimeout: (callback: () => void, delay: number) => TimeoutHandle;
  clearTimeout: (handle: TimeoutHandle) => void;
};

type MinimalIo = {
  to(target: string): {
    emit(event: string, payload: unknown): void;
  };
};

type MinimalSocket = {
  id: string;
  on(event: string, handler: (payload: any) => unknown): void;
  emit(event: string, payload: unknown): void;
  join(code: string): void;
};

type RegisterHandlersInput = {
  io: MinimalIo;
  socket: MinimalSocket;
  store: LobbyStore;
  quizGenerator: QuizGenerator;
  config: ServerConfig;
  timers?: TimerApi;
};

const defaultTimers: TimerApi = {
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: (handle) => clearTimeout(handle),
};

export function registerHandlers(input: RegisterHandlersInput) {
  const timers = input.timers ?? defaultTimers;

  function clearLobbyTimers(code: string) {
    const handles = scheduledLobbyTimers.get(code) ?? [];
    handles.forEach((handle) => timers.clearTimeout(handle));
    scheduledLobbyTimers.delete(code);
  }

  function schedule(code: string, callback: () => void, delay: number) {
    const handle = timers.setTimeout(callback, delay);
    scheduledLobbyTimers.set(code, [
      ...(scheduledLobbyTimers.get(code) ?? []),
      handle,
    ]);
    return handle;
  }

  function scheduleOnly(code: string, callback: () => void, delay: number) {
    clearLobbyTimers(code);
    schedule(code, callback, delay);
  }

  function emitSnapshots(code: string) {
    const lobby = input.store.getLobby(code);

    if (lobby.hostSocketId) {
      input.io
        .to(lobby.hostSocketId)
        .emit(
          socketEvents.lobbySnapshot,
          input.store.getSnapshot(code, "host"),
        );
    }

    lobby.players
      .filter((player: Player) => player.isConnected)
      .forEach((player: Player) => {
        input.io
          .to(player.socketId)
          .emit(
            socketEvents.lobbySnapshot,
            input.store.getSnapshot(code, { playerId: player.id }),
          );
      });
  }

  function emitError(message: string) {
    input.socket.emit(socketEvents.lobbyError, { message });
  }

  function finishGameOrAdvance(
    code: string,
    questionIndex: number,
    totalQuestions: number,
  ) {
    if (questionIndex >= totalQuestions - 1) {
      input.store.finishGame({ code });
      emitSnapshots(code);
      return;
    }

    runGame(code, questionIndex + 1);
  }

  function showLeaderboard(
    code: string,
    questionIndex: number,
    totalQuestions: number,
  ) {
    try {
      const isFinalQuestion = questionIndex >= totalQuestions - 1;
      const phaseDurationMs = isFinalQuestion
        ? input.config.leaderboardDurationMs
        : input.config.nextRoundDelayMs;

      input.store.showLeaderboard({
        code,
        startedAt: Date.now(),
        durationMs: phaseDurationMs,
      });
      emitSnapshots(code);

      scheduleOnly(
        code,
        () => {
          try {
            finishGameOrAdvance(code, questionIndex, totalQuestions);
          } catch {
            clearLobbyTimers(code);
          }
        },
        phaseDurationMs,
      );
    } catch {
      clearLobbyTimers(code);
    }
  }

  function finalizeQuestion(
    code: string,
    questionIndex: number,
    totalQuestions: number,
  ) {
    try {
      clearLobbyTimers(code);
      input.store.finalizeQuestion({ code, finalizedAt: Date.now() });
      emitSnapshots(code);

      schedule(
        code,
        () => {
          showLeaderboard(code, questionIndex, totalQuestions);
        },
        input.config.resultDurationMs,
      );
    } catch {
      clearLobbyTimers(code);
    }
  }

  function allConnectedPlayersAnswered(code: string) {
    const lobby = input.store.getLobby(code);
    const connectedPlayers = lobby.players.filter(
      (player: Player) => player.isConnected,
    );

    if (connectedPlayers.length === 0 || lobby.status !== "question_live") {
      return false;
    }

    const answers = lobby.answers[lobby.currentQuestionIndex] ?? {};
    return connectedPlayers.every((player) => Boolean(answers[player.id]));
  }

  function runGame(code: string, questionIndex: number) {
    const lobby = input.store.startQuestion({
      code,
      questionIndex,
      startedAt: Date.now(),
      durationMs: input.config.questionDurationMs,
    });
    const totalQuestions = lobby.quiz?.questions.length ?? 0;

    emitSnapshots(code);

    scheduleOnly(
      code,
      () => {
        finalizeQuestion(code, questionIndex, totalQuestions);
      },
      input.config.questionDurationMs,
    );
  }

  input.socket.on(
    socketEvents.hostCreateLobby,
    async (payload: { topic: string; questionCount: number }) => {
      try {
        const lobby = input.store.createLobby({
          hostSocketId: input.socket.id,
          topic: payload.topic,
          questionCount: payload.questionCount,
        });

        input.socket.join(lobby.code);
        const quiz = await input.quizGenerator.generateQuiz(payload);
        input.store.attachQuiz(lobby.code, quiz);
        emitSnapshots(lobby.code);
      } catch (error) {
        emitError(
          error instanceof Error ? error.message : "Failed to create lobby",
        );
      }
    },
  );

  input.socket.on(
    socketEvents.playerJoinLobby,
    (payload: { code: string; nickname: string }) => {
      try {
        const player = input.store.addPlayer({
          code: payload.code,
          socketId: input.socket.id,
          nickname: payload.nickname,
        });

        input.socket.join(payload.code);
        input.io
          .to(input.socket.id)
          .emit(
            socketEvents.lobbySnapshot,
            input.store.getSnapshot(payload.code, { playerId: player.id }),
          );
        emitSnapshots(payload.code);
      } catch (error) {
        emitError(
          error instanceof Error ? error.message : "Failed to join lobby",
        );
      }
    },
  );

  input.socket.on(
    socketEvents.playerLeaveLobby,
    (payload: { code: string }) => {
      try {
        const lobby = input.store.setPlayerConnection(input.socket.id, false);
        if (lobby && lobby.code === payload.code) {
          emitSnapshots(payload.code);
        }
      } catch (error) {
        emitError(
          error instanceof Error ? error.message : "Failed to leave lobby",
        );
      }
    },
  );

  input.socket.on(
    socketEvents.hostKickPlayer,
    (payload: { code: string; playerId: string }) => {
      try {
        const lobby = input.store.getLobby(payload.code);
        const target = lobby.players.find(
          (player) => player.id === payload.playerId,
        );

        if (!target) {
          throw new Error("Player not found");
        }

        if (lobby.hostSocketId !== input.socket.id) {
          throw new Error("Only the host can kick players");
        }

        input.io
          .to(target.socketId)
          .emit(socketEvents.playerKicked, { code: payload.code });
        input.store.removePlayer({
          code: payload.code,
          playerId: payload.playerId,
        });
        emitSnapshots(payload.code);
      } catch (error) {
        emitError(
          error instanceof Error ? error.message : "Failed to kick player",
        );
      }
    },
  );

  input.socket.on(socketEvents.gameStart, (payload: { code: string }) => {
    try {
      clearLobbyTimers(payload.code);
      runGame(payload.code, 0);
    } catch (error) {
      emitError(
        error instanceof Error ? error.message : "Failed to start game",
      );
    }
  });

  input.socket.on(
    socketEvents.playerSubmitAnswer,
    (payload: { code: string; answerIndex: number }) => {
      try {
        const lobby = input.store.getLobby(payload.code);
        const questionIndex = lobby.currentQuestionIndex;
        const totalQuestions = lobby.quiz?.questions.length ?? 0;

        input.store.submitAnswer({
          code: payload.code,
          socketId: input.socket.id,
          answerIndex: payload.answerIndex,
          submittedAt: Date.now(),
        });
        emitSnapshots(payload.code);

        if (allConnectedPlayersAnswered(payload.code)) {
          finalizeQuestion(payload.code, questionIndex, totalQuestions);
        }
      } catch (error) {
        emitError(
          error instanceof Error ? error.message : "Failed to submit answer",
        );
      }
    },
  );

  input.socket.on(socketEvents.gameRestart, (payload: { code: string }) => {
    try {
      clearLobbyTimers(payload.code);
      input.store.restartLobby({ code: payload.code });
      emitSnapshots(payload.code);
    } catch (error) {
      emitError(
        error instanceof Error ? error.message : "Failed to restart game",
      );
    }
  });

  input.socket.on("disconnect", () => {
    const lobby = input.store.setPlayerConnection(input.socket.id, false);
    if (lobby) {
      emitSnapshots(lobby.code);
    }
  });
}
