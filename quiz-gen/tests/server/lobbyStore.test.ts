import { describe, expect, it } from "vitest";
import { createLobbyStore } from "../../server/game/lobbyStore";
import type { Quiz } from "../../server/game/types";

const sampleQuiz: Quiz = {
  title: "Science quiz",
  questions: [
    {
      prompt: "What gas do plants absorb from the atmosphere?",
      options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Helium"],
      correctIndex: 2,
      explanation: "Plants use carbon dioxide during photosynthesis.",
    },
  ],
};

describe("lobbyStore", () => {
  it("creates a lobby and adds players with unique nicknames", () => {
    const store = createLobbyStore();
    const lobby = store.createLobby({
      hostSocketId: "host-1",
      topic: "History",
      questionCount: 5,
    });

    store.addPlayer({
      code: lobby.code,
      socketId: "player-1",
      nickname: "Alex",
    });

    expect(() =>
      store.addPlayer({
        code: lobby.code,
        socketId: "player-2",
        nickname: "Alex",
      }),
    ).toThrow(/nickname/i);
  });

  it("records only the first answer for a player during a live question", () => {
    const store = createLobbyStore();
    const lobby = store.createLobby({
      hostSocketId: "host-1",
      topic: "Science",
      questionCount: 1,
    });

    store.attachQuiz(lobby.code, sampleQuiz);
    store.addPlayer({
      code: lobby.code,
      socketId: "player-1",
      nickname: "Alex",
    });
    store.startQuestion({
      code: lobby.code,
      questionIndex: 0,
      startedAt: 0,
      durationMs: 15000,
    });

    store.submitAnswer({
      code: lobby.code,
      socketId: "player-1",
      answerIndex: 2,
      submittedAt: 1000,
    });

    expect(() =>
      store.submitAnswer({
        code: lobby.code,
        socketId: "player-1",
        answerIndex: 1,
        submittedAt: 1200,
      }),
    ).toThrow(/already answered/i);
  });

  it("finalizes a question, progresses through leaderboard, and resets for replay", () => {
    const store = createLobbyStore();
    const lobby = store.createLobby({
      hostSocketId: "host-1",
      topic: "Science",
      questionCount: 1,
    });

    store.attachQuiz(lobby.code, sampleQuiz);
    const player = store.addPlayer({
      code: lobby.code,
      socketId: "player-1",
      nickname: "Alex",
    });
    store.startQuestion({
      code: lobby.code,
      questionIndex: 0,
      startedAt: 0,
      durationMs: 15000,
    });
    store.submitAnswer({
      code: lobby.code,
      socketId: "player-1",
      answerIndex: 2,
      submittedAt: 1000,
    });

    const afterFinalize = store.finalizeQuestion({
      code: lobby.code,
      finalizedAt: 15000,
    });

    expect(afterFinalize.players[0]?.score).toBeGreaterThan(0);
    expect(afterFinalize.status).toBe("question_result");
    expect(afterFinalize.answers[0]?.[player.id]?.isCorrect).toBe(true);

    const leaderboard = store.showLeaderboard({
      code: lobby.code,
      startedAt: 17000,
      durationMs: 5000,
    });
    expect(leaderboard.status).toBe("leaderboard");
    expect(leaderboard.phaseStartedAt).toBe(17000);
    expect(leaderboard.phaseEndsAt).toBe(22000);
    expect(store.getSnapshot(lobby.code, "host").currentQuestion).toBeNull();

    const finished = store.finishGame({ code: lobby.code });
    expect(finished.status).toBe("finished");
    expect(finished.phaseStartedAt).toBeNull();
    expect(finished.phaseEndsAt).toBeNull();
    expect(store.getSnapshot(lobby.code, "host").currentQuestion).toBeNull();

    const restarted = store.restartLobby({ code: lobby.code });

    expect(restarted.status).toBe("ready");
    expect(restarted.players[0]?.score).toBe(0);
    expect(restarted.currentQuestionIndex).toBe(0);
    expect(restarted.answers).toEqual({});
  });

  it("rejects question counts outside the supported range", () => {
    const store = createLobbyStore();

    expect(() =>
      store.createLobby({
        hostSocketId: "host-1",
        topic: "Science",
        questionCount: 0,
      }),
    ).toThrow(/between/i);

    expect(() =>
      store.createLobby({
        hostSocketId: "host-1",
        topic: "Science",
        questionCount: 26,
      }),
    ).toThrow(/between/i);
  });

  it("reclaims a disconnected player record when they rejoin with the same nickname", () => {
    const store = createLobbyStore();
    const lobby = store.createLobby({
      hostSocketId: "host-1",
      topic: "Science",
      questionCount: 1,
    });

    const player = store.addPlayer({
      code: lobby.code,
      socketId: "player-1",
      nickname: "Alex",
    });
    store.setPlayerConnection("player-1", false);

    const rejoined = store.addPlayer({
      code: lobby.code,
      socketId: "player-2",
      nickname: "Alex",
    });

    expect(rejoined.id).toBe(player.id);
    expect(rejoined.socketId).toBe("player-2");
    expect(rejoined.isConnected).toBe(true);
    expect(store.getLobby(lobby.code).players).toHaveLength(1);
  });

  it("removes a kicked player and clears their current answer", () => {
    const store = createLobbyStore();
    const lobby = store.createLobby({
      hostSocketId: "host-1",
      topic: "Science",
      questionCount: 1,
    });

    store.attachQuiz(lobby.code, sampleQuiz);
    const player = store.addPlayer({
      code: lobby.code,
      socketId: "player-1",
      nickname: "Alex",
    });
    store.startQuestion({
      code: lobby.code,
      questionIndex: 0,
      startedAt: 0,
      durationMs: 15000,
    });
    store.submitAnswer({
      code: lobby.code,
      socketId: "player-1",
      answerIndex: 2,
      submittedAt: 1000,
    });

    store.removePlayer({ code: lobby.code, playerId: player.id });

    expect(store.getLobby(lobby.code).players).toHaveLength(0);
    expect(store.getLobby(lobby.code).answers[0]?.[player.id]).toBeUndefined();
  });
});
