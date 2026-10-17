import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HostScreen } from "../../src/features/host/HostScreen";
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

const readySnapshot: LobbySnapshot = {
  role: "host",
  code: "ABCD",
  topic: "Volcanoes",
  questionCount: 10,
  quizTitle: "Volcano quiz",
  status: "ready",
  players: [],
  currentQuestionIndex: 0,
  totalQuestions: 10,
  currentQuestion: null,
  phaseStartedAt: null,
  phaseEndsAt: null,
  me: null,
};

const rosterSnapshot: LobbySnapshot = {
  ...readySnapshot,
  players: [
    {
      id: "player-1",
      nickname: "Alex",
      score: 300,
      isConnected: true,
      rank: 1,
      hasAnswered: false,
    },
  ],
};

describe("HostScreen", () => {
  it("locks the whole form and shows loading while generating a quiz", async () => {
    const socket = createFakeSocket();
    render(
      <MemoryRouter>
        <HostScreen socket={socket as never} />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/topic/i), "Volcanoes");
    await userEvent.clear(screen.getByLabelText(/questions/i));
    await userEvent.type(screen.getByLabelText(/questions/i), "13");
    await userEvent.click(
      screen.getByRole("button", { name: /generate quiz/i }),
    );

    expect(socket.emit).toHaveBeenCalledWith("host:createLobby", {
      topic: "Volcanoes",
      questionCount: 13,
    });
    expect(screen.getByLabelText(/topic/i)).toBeDisabled();
    expect(screen.getByLabelText(/questions/i)).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /generating quiz/i }),
    ).toBeDisabled();

    await act(async () => {
      socket.trigger("lobby:snapshot", readySnapshot);
    });

    expect(screen.getByLabelText(/topic/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/questions/i)).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: /generate quiz/i }),
    ).not.toBeDisabled();
  });

  it("blocks quiz generation for invalid question counts", async () => {
    const socket = createFakeSocket();
    render(
      <MemoryRouter>
        <HostScreen socket={socket as never} />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/topic/i), "Volcanoes");
    await userEvent.clear(screen.getByLabelText(/questions/i));
    await userEvent.type(screen.getByLabelText(/questions/i), "0");

    expect(
      screen.getByRole("button", { name: /generate quiz/i }),
    ).toBeDisabled();
  });

  it("lets the host kick a player from the roster", async () => {
    const socket = createFakeSocket();
    render(
      <MemoryRouter>
        <HostScreen socket={socket as never} />
      </MemoryRouter>,
    );

    await act(async () => {
      socket.trigger("lobby:snapshot", rosterSnapshot);
    });

    await userEvent.click(screen.getByRole("button", { name: /kick alex/i }));

    expect(socket.emit).toHaveBeenCalledWith("host:kickPlayer", {
      code: "ABCD",
      playerId: "player-1",
    });
  });
});
