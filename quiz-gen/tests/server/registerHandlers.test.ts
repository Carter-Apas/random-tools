import { describe, expect, it, vi } from "vitest";
import { createLobbyStore } from "../../server/game/lobbyStore";
import { registerHandlers } from "../../server/socket/registerHandlers";
import type { LobbySnapshot } from "../../shared/lobby";

function createFakeIo() {
  const emitted: Array<{ target: string; event: string; payload: unknown }> =
    [];

  return {
    emitted,
    to(target: string) {
      return {
        emit(event: string, payload: unknown) {
          emitted.push({ target, event, payload });
        },
      };
    },
  };
}

function createFakeSocket(id: string) {
  const handlers = new Map<string, (payload: any) => unknown>();
  const emitted: Array<{ event: string; payload: unknown }> = [];
  const joined: string[] = [];

  return {
    id,
    emitted,
    joined,
    on(event: string, handler: (payload: any) => unknown) {
      handlers.set(event, handler);
    },
    emit(event: string, payload: unknown) {
      emitted.push({ event, payload });
    },
    join(code: string) {
      joined.push(code);
    },
    async trigger(event: string, payload: any) {
      const handler = handlers.get(event);
      if (!handler) {
        throw new Error(`Missing handler for ${event}`);
      }

      return handler(payload);
    },
  };
}

function lastSnapshotFor(io: ReturnType<typeof createFakeIo>, target: string) {
  return [...io.emitted]
    .reverse()
    .find(
      (entry) => entry.target === target && entry.event === "lobby:snapshot",
    )?.payload as LobbySnapshot | undefined;
}

describe("registerHandlers", () => {
  it("emits a ready snapshot after successful quiz generation", async () => {
    const io = createFakeIo();
    const socket = createFakeSocket("host-1");
    const store = createLobbyStore(() => 0);
    const quizGenerator = {
      generateQuiz: vi.fn().mockResolvedValue({
        title: "Ocean quiz",
        questions: [
          {
            prompt: "Largest ocean?",
            options: ["Atlantic", "Indian", "Pacific", "Arctic"],
            correctIndex: 2,
            explanation: "The Pacific is the largest ocean.",
          },
        ],
      }),
    };

    registerHandlers({
      io: io as never,
      socket: socket as never,
      store,
      quizGenerator,
      config: {
        openAIApiKey: "",
        openAIModel: "gpt-4.1-mini",
        port: 3001,
        questionDurationMs: 15000,
        resultDurationMs: 4000,
        nextRoundDelayMs: 2500,
        leaderboardDurationMs: 5000,
      },
      timers: {
        setTimeout: vi.fn(),
        clearTimeout: vi.fn(),
      },
    });

    await socket.trigger("host:createLobby", {
      topic: "Oceans",
      questionCount: 1,
    });

    expect(quizGenerator.generateQuiz).toHaveBeenCalledWith({
      topic: "Oceans",
      questionCount: 1,
    });
    expect(socket.joined[0]).toMatch(/^[A-Z]{4}$/);
    expect(io.emitted.some((entry) => entry.event === "lobby:snapshot")).toBe(
      true,
    );
  });

  it("finalizes the round early when all connected players answer", async () => {
    const io = createFakeIo();
    const hostSocket = createFakeSocket("host-1");
    const playerOneSocket = createFakeSocket("player-1");
    const playerTwoSocket = createFakeSocket("player-2");
    const store = createLobbyStore(() => 0);
    const handles: Array<{ id: number; callback: () => void; delay: number }> =
      [];
    let nextId = 1;
    const clearTimeout = vi.fn();
    const quizGenerator = {
      generateQuiz: vi.fn().mockResolvedValue({
        title: "Ocean quiz",
        questions: [
          {
            prompt: "Largest ocean?",
            options: ["Atlantic", "Indian", "Pacific", "Arctic"],
            correctIndex: 2,
            explanation: "The Pacific is the largest ocean.",
          },
        ],
      }),
    };

    const config = {
      openAIApiKey: "",
      openAIModel: "gpt-4.1-mini",
      port: 3001,
      questionDurationMs: 15000,
      resultDurationMs: 2000,
      nextRoundDelayMs: 2500,
      leaderboardDurationMs: 5000,
    };

    [hostSocket, playerOneSocket, playerTwoSocket].forEach((socket) => {
      registerHandlers({
        io: io as never,
        socket: socket as never,
        store,
        quizGenerator,
        config,
        timers: {
          setTimeout(callback, delay) {
            const handle = { id: nextId++, callback, delay };
            handles.push(handle);
            return handle as never;
          },
          clearTimeout,
        },
      });
    });

    await hostSocket.trigger("host:createLobby", {
      topic: "Oceans",
      questionCount: 1,
    });
    const code = hostSocket.joined[0]!;

    await playerOneSocket.trigger("player:joinLobby", {
      code,
      nickname: "Alex",
    });
    await playerTwoSocket.trigger("player:joinLobby", {
      code,
      nickname: "Blair",
    });
    await hostSocket.trigger("game:start", { code });

    expect(lastSnapshotFor(io, "host-1")?.status).toBe("question_live");
    expect(
      handles.some((handle) => handle.delay === config.questionDurationMs),
    ).toBe(true);

    await playerOneSocket.trigger("player:submitAnswer", {
      code,
      answerIndex: 2,
    });
    expect(lastSnapshotFor(io, "host-1")?.status).toBe("question_live");

    await playerTwoSocket.trigger("player:submitAnswer", {
      code,
      answerIndex: 1,
    });

    expect(clearTimeout).toHaveBeenCalled();
    expect(lastSnapshotFor(io, "host-1")?.status).toBe("question_result");
    expect(
      handles.some((handle) => handle.delay === config.resultDurationMs),
    ).toBe(true);
  });

  it("shows a leaderboard countdown before advancing to the next round", async () => {
    const io = createFakeIo();
    const hostSocket = createFakeSocket("host-1");
    const store = createLobbyStore(() => 0);
    const handles: Array<{ id: number; callback: () => void; delay: number }> =
      [];
    let nextId = 1;
    const quizGenerator = {
      generateQuiz: vi.fn().mockResolvedValue({
        title: "Ocean quiz",
        questions: [
          {
            prompt: "Largest ocean?",
            options: ["Atlantic", "Indian", "Pacific", "Arctic"],
            correctIndex: 2,
            explanation: "The Pacific is the largest ocean.",
          },
          {
            prompt: "Smallest ocean?",
            options: ["Atlantic", "Indian", "Pacific", "Arctic"],
            correctIndex: 3,
            explanation: "The Arctic is the smallest ocean.",
          },
        ],
      }),
    };

    const config = {
      openAIApiKey: "",
      openAIModel: "gpt-4.1-mini",
      port: 3001,
      questionDurationMs: 15000,
      resultDurationMs: 2000,
      nextRoundDelayMs: 2500,
      leaderboardDurationMs: 5000,
    };

    registerHandlers({
      io: io as never,
      socket: hostSocket as never,
      store,
      quizGenerator,
      config,
      timers: {
        setTimeout(callback, delay) {
          const handle = { id: nextId++, callback, delay };
          handles.push(handle);
          return handle as never;
        },
        clearTimeout: vi.fn(),
      },
    });

    await hostSocket.trigger("host:createLobby", {
      topic: "Oceans",
      questionCount: 2,
    });
    const code = hostSocket.joined[0]!;
    await hostSocket.trigger("game:start", { code });

    handles
      .find((handle) => handle.delay === config.questionDurationMs)!
      .callback();
    handles
      .find((handle) => handle.delay === config.resultDurationMs)!
      .callback();

    const leaderboardSnapshot = lastSnapshotFor(io, "host-1");
    expect(leaderboardSnapshot?.status).toBe("leaderboard");
    expect(leaderboardSnapshot?.currentQuestion).toBeNull();
    expect(leaderboardSnapshot?.phaseStartedAt).not.toBeNull();
    expect(leaderboardSnapshot?.phaseEndsAt).toBe(
      (leaderboardSnapshot?.phaseStartedAt ?? 0) + config.nextRoundDelayMs,
    );

    handles
      .findLast((handle) => handle.delay === config.nextRoundDelayMs)!
      .callback();

    const nextQuestionSnapshot = lastSnapshotFor(io, "host-1");
    expect(nextQuestionSnapshot?.status).toBe("question_live");
    expect(nextQuestionSnapshot?.currentQuestionIndex).toBe(1);
  });

  it("shows the final leaderboard before moving to the finished waiting state", async () => {
    const io = createFakeIo();
    const hostSocket = createFakeSocket("host-1");
    const store = createLobbyStore(() => 0);
    const handles: Array<{ id: number; callback: () => void; delay: number }> =
      [];
    let nextId = 1;
    const quizGenerator = {
      generateQuiz: vi.fn().mockResolvedValue({
        title: "Ocean quiz",
        questions: [
          {
            prompt: "Largest ocean?",
            options: ["Atlantic", "Indian", "Pacific", "Arctic"],
            correctIndex: 2,
            explanation: "The Pacific is the largest ocean.",
          },
        ],
      }),
    };

    const config = {
      openAIApiKey: "",
      openAIModel: "gpt-4.1-mini",
      port: 3001,
      questionDurationMs: 15000,
      resultDurationMs: 2000,
      nextRoundDelayMs: 2500,
      leaderboardDurationMs: 5000,
    };

    registerHandlers({
      io: io as never,
      socket: hostSocket as never,
      store,
      quizGenerator,
      config,
      timers: {
        setTimeout(callback, delay) {
          const handle = { id: nextId++, callback, delay };
          handles.push(handle);
          return handle as never;
        },
        clearTimeout: vi.fn(),
      },
    });

    await hostSocket.trigger("host:createLobby", {
      topic: "Oceans",
      questionCount: 1,
    });
    const code = hostSocket.joined[0]!;
    await hostSocket.trigger("game:start", { code });

    handles
      .find((handle) => handle.delay === config.questionDurationMs)!
      .callback();
    handles
      .find((handle) => handle.delay === config.resultDurationMs)!
      .callback();
    expect(lastSnapshotFor(io, "host-1")?.status).toBe("leaderboard");

    handles
      .findLast((handle) => handle.delay === config.leaderboardDurationMs)!
      .callback();

    const finishedSnapshot = lastSnapshotFor(io, "host-1");
    expect(finishedSnapshot?.status).toBe("finished");
    expect(finishedSnapshot?.currentQuestion).toBeNull();
    expect(finishedSnapshot?.phaseStartedAt).toBeNull();
    expect(finishedSnapshot?.phaseEndsAt).toBeNull();
  });

  it("marks a leaving player disconnected and lets them reclaim the same nickname later", async () => {
    const io = createFakeIo();
    const hostSocket = createFakeSocket("host-1");
    const playerSocket = createFakeSocket("player-1");
    const reconnectSocket = createFakeSocket("player-2");
    const store = createLobbyStore(() => 0);
    const quizGenerator = {
      generateQuiz: vi.fn().mockResolvedValue({
        title: "Ocean quiz",
        questions: [
          {
            prompt: "Largest ocean?",
            options: ["Atlantic", "Indian", "Pacific", "Arctic"],
            correctIndex: 2,
            explanation: "The Pacific is the largest ocean.",
          },
        ],
      }),
    };

    const config = {
      openAIApiKey: "",
      openAIModel: "gpt-4.1-mini",
      port: 3001,
      questionDurationMs: 15000,
      resultDurationMs: 2000,
      nextRoundDelayMs: 2500,
      leaderboardDurationMs: 5000,
    };

    [hostSocket, playerSocket, reconnectSocket].forEach((socket) => {
      registerHandlers({
        io: io as never,
        socket: socket as never,
        store,
        quizGenerator,
        config,
        timers: {
          setTimeout: vi.fn(),
          clearTimeout: vi.fn(),
        },
      });
    });

    await hostSocket.trigger("host:createLobby", {
      topic: "Oceans",
      questionCount: 1,
    });
    const code = hostSocket.joined[0]!;
    await playerSocket.trigger("player:joinLobby", { code, nickname: "Alex" });
    const playerId = store.getLobby(code).players[0]!.id;

    await playerSocket.trigger("player:leaveLobby", { code });

    expect(store.getLobby(code).players[0]?.isConnected).toBe(false);

    await reconnectSocket.trigger("player:joinLobby", {
      code,
      nickname: "Alex",
    });

    expect(store.getLobby(code).players[0]?.id).toBe(playerId);
    expect(store.getLobby(code).players[0]?.socketId).toBe("player-2");
    expect(store.getLobby(code).players[0]?.isConnected).toBe(true);
  });

  it("lets the host kick a player and the player can rejoin afterward", async () => {
    const io = createFakeIo();
    const hostSocket = createFakeSocket("host-1");
    const playerSocket = createFakeSocket("player-1");
    const rejoinSocket = createFakeSocket("player-2");
    const store = createLobbyStore(() => 0);
    const quizGenerator = {
      generateQuiz: vi.fn().mockResolvedValue({
        title: "Ocean quiz",
        questions: [
          {
            prompt: "Largest ocean?",
            options: ["Atlantic", "Indian", "Pacific", "Arctic"],
            correctIndex: 2,
            explanation: "The Pacific is the largest ocean.",
          },
        ],
      }),
    };

    const config = {
      openAIApiKey: "",
      openAIModel: "gpt-4.1-mini",
      port: 3001,
      questionDurationMs: 15000,
      resultDurationMs: 2000,
      nextRoundDelayMs: 2500,
      leaderboardDurationMs: 5000,
    };

    [hostSocket, playerSocket, rejoinSocket].forEach((socket) => {
      registerHandlers({
        io: io as never,
        socket: socket as never,
        store,
        quizGenerator,
        config,
        timers: {
          setTimeout: vi.fn(),
          clearTimeout: vi.fn(),
        },
      });
    });

    await hostSocket.trigger("host:createLobby", {
      topic: "Oceans",
      questionCount: 1,
    });
    const code = hostSocket.joined[0]!;
    await playerSocket.trigger("player:joinLobby", { code, nickname: "Alex" });
    const playerId = store.getLobby(code).players[0]!.id;

    await hostSocket.trigger("host:kickPlayer", { code, playerId });

    expect(store.getLobby(code).players).toHaveLength(0);

    await rejoinSocket.trigger("player:joinLobby", { code, nickname: "Alex" });

    expect(store.getLobby(code).players).toHaveLength(1);
    expect(store.getLobby(code).players[0]?.nickname).toBe("Alex");
  });
});
