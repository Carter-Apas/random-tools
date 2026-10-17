import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PlayerScreen } from "../../src/features/player/PlayerScreen";
import type { LobbySnapshot } from "../../src/features/shared/types";

function createFakeSocket() {
  const listeners = new Map<string, Set<(payload: unknown) => void>>();

  return {
    connected: false,
    connect() {},
    disconnect() {},
    on(event: string, handler: (payload: unknown) => void) {
      listeners.set(event, new Set([...(listeners.get(event) ?? []), handler]));
    },
    off(event: string, handler: (payload: unknown) => void) {
      listeners.get(event)?.delete(handler);
    },
    emit: vi.fn(),
    trigger(event: string, payload: unknown) {
      listeners.get(event)?.forEach((handler) => handler(payload));
    },
  };
}

const correctRevealSnapshot: LobbySnapshot = {
  role: "player",
  code: "ABCD",
  topic: "Volcanoes",
  questionCount: 1,
  quizTitle: "Volcano quiz",
  status: "question_result",
  players: [
    {
      id: "player-1",
      nickname: "Sam",
      score: 950,
      isConnected: true,
      rank: 1,
      hasAnswered: true,
    },
  ],
  currentQuestionIndex: 0,
  totalQuestions: 1,
  currentQuestion: {
    prompt: "Which volcano destroyed Pompeii?",
    options: ["Etna", "Vesuvius", "Fuji", "Krakatoa"],
    startedAt: 0,
    endsAt: 15000,
    correctIndex: 1,
    explanation: "Mount Vesuvius erupted in AD 79.",
  },
  phaseStartedAt: null,
  phaseEndsAt: null,
  me: {
    id: "player-1",
    nickname: "Sam",
    score: 950,
    answerLocked: true,
    selectedAnswerIndex: 1,
    lastScoreAwarded: 950,
    answerWasCorrect: true,
  },
};

const leaderboardSnapshot: LobbySnapshot = {
  role: "player",
  code: "ABCD",
  topic: "Volcanoes",
  questionCount: 2,
  quizTitle: "Volcano quiz",
  status: "leaderboard",
  players: [
    {
      id: "player-1",
      nickname: "Sam",
      score: 950,
      isConnected: true,
      rank: 1,
      hasAnswered: true,
    },
  ],
  currentQuestionIndex: 0,
  totalQuestions: 2,
  currentQuestion: null,
  phaseStartedAt: 1000,
  phaseEndsAt: 6000,
  me: {
    id: "player-1",
    nickname: "Sam",
    score: 950,
    answerLocked: true,
    selectedAnswerIndex: 1,
    lastScoreAwarded: 950,
    answerWasCorrect: true,
  },
};

const readySnapshot: LobbySnapshot = {
  role: "player",
  code: "ABCD",
  topic: "Volcanoes",
  questionCount: 2,
  quizTitle: "Volcano quiz",
  status: "ready",
  players: [
    {
      id: "player-1",
      nickname: "Sam",
      score: 0,
      isConnected: true,
      rank: 1,
      hasAnswered: false,
    },
  ],
  currentQuestionIndex: 0,
  totalQuestions: 2,
  currentQuestion: null,
  phaseStartedAt: null,
  phaseEndsAt: null,
  me: {
    id: "player-1",
    nickname: "Sam",
    score: 0,
    answerLocked: false,
    selectedAnswerIndex: null,
    lastScoreAwarded: null,
    answerWasCorrect: null,
  },
};

describe("PlayerScreen", () => {
  it("lets a player join with room code and nickname", async () => {
    const socket = createFakeSocket();
    render(
      <MemoryRouter>
        <PlayerScreen socket={socket as never} />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/room code/i), "ABCD");
    await userEvent.type(screen.getByLabelText(/nickname/i), "Sam");
    await userEvent.click(screen.getByRole("button", { name: /join lobby/i }));

    expect(socket.emit).toHaveBeenCalledWith("player:joinLobby", {
      code: "ABCD",
      nickname: "Sam",
    });
  });

  it("shows a celebration overlay when the player answered correctly", async () => {
    const socket = createFakeSocket();
    render(
      <MemoryRouter>
        <PlayerScreen socket={socket as never} />
      </MemoryRouter>,
    );

    await act(async () => {
      socket.trigger("lobby:snapshot", correctRevealSnapshot);
    });

    expect(screen.getByText(/correct!/i)).toBeInTheDocument();
    expect(screen.getByText(/score this round: 950/i)).toBeInTheDocument();
  });

  it("shows a next-round countdown during the leaderboard phase", async () => {
    const socket = createFakeSocket();
    render(
      <MemoryRouter>
        <PlayerScreen socket={socket as never} />
      </MemoryRouter>,
    );

    await act(async () => {
      socket.trigger("lobby:snapshot", leaderboardSnapshot);
    });

    expect(
      screen.getByRole("heading", { name: /next round in/i }),
    ).toBeInTheDocument();
  });

  it("shows the updated waiting copy before the host starts", async () => {
    const socket = createFakeSocket();
    render(
      <MemoryRouter>
        <PlayerScreen socket={socket as never} />
      </MemoryRouter>,
    );

    await act(async () => {
      socket.trigger("lobby:snapshot", readySnapshot);
    });

    expect(
      screen.getByText(/waiting for the host to start the game/i),
    ).toBeInTheDocument();
  });
});
