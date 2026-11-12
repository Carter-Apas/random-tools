import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { Arena } from "./Arena";
import { useClock } from "./motion";
import { request, socket } from "./connection";

import type { RoomView } from "../shared/types";
import { heatStage, paces } from "../shared/types";

const Timer = ({ room, now }: { room: RoomView; now: number }) => {
  const remaining = Math.min(room.turnDurationMs, Math.max(0, room.deadline - now));
  const seconds = Math.ceil(remaining / 1000);
  const ratio = Math.min(100, (remaining / room.turnDurationMs) * 100);
  return (
    <div className={`turn-timer ${seconds <= 5 ? "turn-timer-danger" : ""}`}>
      <div className="turn-timer-label">
        <span>{room.phase === "charred" ? "Roasted!" : "Turn time"}</span>
        <strong>{room.phase === "charred" ? "Ouch!" : `${seconds}s`}</strong>
      </div>
      <p className="heat-caption">{heatLabels[heatStage(room, now)]}</p>
      <div
        className="turn-timer-track"
        role="progressbar"
        aria-label="Your turn time remaining"
        aria-valuemin={0}
        aria-valuemax={Math.ceil(room.turnDurationMs / 1000)}
        aria-valuenow={Math.min(Math.ceil(room.turnDurationMs / 1000), seconds)}
      >
        <span style={{ width: `${ratio}%` }} />
      </div>
    </div>
  );
};

const AnswerBox = ({
  room,
  you,
  connected,
}: {
  room: RoomView;
  you: string;
  connected: boolean;
}) => {
  const [answer, setAnswer] = useState("");
  const [failure, setFailure] = useState({ turn: 0, message: "" });
  const [sending, setSending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const active = room.activeId === you;
  const alive = hasHearts(room, you);
  const ready = canAnswer(room, you, connected);
  const error = failure.turn === room.turn ? failure.message : "";
  useEffect(() => {
    if (ready && window.matchMedia("(pointer: fine)").matches) input.current?.focus();
  }, [ready]);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      socket.emit("typing", { draft: answer, turn: room.turn });
    }, 70);
    return () => window.clearTimeout(timer);
  }, [answer, ready, room.turn]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready || !answer.trim() || sending) return;
    setSending(true);
    const result = await request("answer", { answer: answer.trim(), turn: room.turn });
    setSending(false);
    if (result.ok) setAnswer("");
    else {
      setFailure({ turn: room.turn, message: result.error ?? "Wrong answer. Try again!" });
      input.current?.focus();
      input.current?.select();
    }
  };

  return (
    <div className={`answer-box ${active ? "your-turn" : ""} ${error ? "answer-wrong" : ""}`}>
      <label htmlFor="answer" className="turn-label">
        {turnMessage(room, alive, active)}
      </label>
      <form
        onSubmit={(e) => {
          void submit(e);
        }}
        className="answer-form"
      >
        <input
          id="answer"
          ref={input}
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value);
            setFailure({ turn: room.turn, message: "" });
          }}
          disabled={!alive || !connected}
          readOnly={sending}
          aria-invalid={Boolean(error)}
          aria-describedby="answer-feedback"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={100}
          placeholder={ready ? "Type your answer…" : "Prepare an answer privately…"}
          enterKeyHint="send"
        />
        <button className="pixel-button primary" disabled={!ready || !answer.trim() || sending}>
          Pass it! <span aria-hidden="true">↻</span>
        </button>
      </form>
      <p id="answer-feedback" className="answer-feedback" role="status">
        {error || answerHint(ready)}
      </p>
      {!active && <LiveAnswer room={room} />}
    </div>
  );
};

const hasHearts = (room: RoomView, you: string) =>
  (room.players.find((player) => player.id === you)?.hearts ?? 0) > 0;

const LiveAnswer = ({ room }: { room: RoomView }) => {
  if (room.phase !== "answering") return null;
  const name = room.players.find((player) => player.id === room.activeId)?.name ?? "The gardener";
  return (
    <div className="live-answer">
      <span>{name}'s live answer</span>
      <output aria-label={`${name}'s live answer`}>{room.draft || "Thinking…"}</output>
    </div>
  );
};

const Lobby = ({
  room,
  host,
  onAction,
}: {
  room: RoomView;
  host: boolean;
  onAction: (event: string, data?: unknown) => Promise<void>;
}) => {
  const connectedCount = room.players.filter((player) => player.connected).length;
  return (
    <div className="lobby-controls panel">
      <img className="lobby-vegetable" src="/assets/potato.png" alt="" />
      <h2>{room.status === "finished" ? "One more harvest?" : "Gather your gang"}</h2>
      <p>
        {room.status === "finished"
          ? "The host can start a fresh round. Everyone gets three hearts again."
          : "Share the room code with your friends. The host starts when everyone is in."}
      </p>
      <div className="lobby-count">{connectedCount} / 8 gardeners</div>
      {host ? (
        <>
          <label htmlFor="room-pace">How hot?</label>
          <select
            id="room-pace"
            value={room.pace}
            onChange={(e) => {
              void onAction("pace", { pace: e.target.value });
            }}
          >
            {Object.entries(paces).map(([key, pace]) => (
              <option value={key} key={key}>
                {pace.label} · {pace.min / 1000}–{pace.max / 1000}s turns
              </option>
            ))}
          </select>
          <button
            className="pixel-button primary"
            disabled={connectedCount < 2}
            onClick={() => {
              void onAction("start");
            }}
          >
            {room.status === "finished" ? "Play again" : "Let's get cooking!"}
          </button>
          <button
            className="practice-link"
            disabled={room.players.length >= 8}
            onClick={() => {
              void onAction("bot");
            }}
          >
            + Add a practice gardener
          </button>
        </>
      ) : (
        <p className="waiting-host">Waiting for the host to start…</p>
      )}
      <p className="small-note">
        {connectedCount < 2
          ? "You need one more gardener to play."
          : "Everyone plays on their own screen."}
      </p>
    </div>
  );
};

export const Game = ({
  room,
  you,
  connected,
  onAction,
}: {
  room: RoomView;
  you: string;
  connected: boolean;
  onAction: (event: string, data?: unknown) => Promise<void>;
}) => {
  const now = useClock(room.serverTime);
  const playing = room.status === "playing";
  return (
    <main className="game-layout">
      <div className="game-main">
        <Arena room={room} you={you} now={now} />
        {playing && <AnswerBox key={room.round} room={room} you={you} connected={connected} />}
        <div className="garden-log" aria-live="polite" aria-atomic="true">
          <span className="log-flower" aria-hidden="true">
            ✿
          </span>
          {room.events.at(-1)?.text ?? "Everyone starts with three hearts. Make them count."}
        </div>
      </div>
      <aside className="game-sidebar">
        {playing && room.category ? (
          <section className="panel category-panel">
            <div className="category-top">
              <img src={`/assets/${room.category.vegetable}.png`} alt="" />
              <span>{room.category.name}</span>
            </div>
            <h2 key={room.category.id}>{room.category.prompt}</h2>
            <p className="category-hint">{room.category.hint}</p>
            <Timer room={room} now={now} />
            <div className="picked-heading">
              <strong>Already picked</strong>
              <span>
                {room.used.length} / {room.categoryGoal}
              </span>
            </div>
            <div className="picked-answers">
              {room.used.length ? (
                room.used.map((answer) => <span key={answer}>{answer}</span>)
              ) : (
                <p>A fresh patch. Any answer is yours!</p>
              )}
            </div>
            <p className="small-note">
              New category after {room.categoryGoal} fresh answers or a roast. Each player gets a
              fresh timer.
            </p>
          </section>
        ) : (
          <Lobby room={room} host={room.hostId === you} onAction={onAction} />
        )}
        <div className="table-rules">
          <span>
            <img src="/assets/heart.png" alt="" />
            Three hearts each
          </span>
          <span>
            <img src="/assets/carrot.png" alt="" />
            24 rotating categories
          </span>
          <span>
            <img src="/assets/fire-still.png" alt="" />
            The fire keeps it hot
          </span>
        </div>
      </aside>
    </main>
  );
};

const canAnswer = (room: RoomView, you: string, connected: boolean) =>
  room.activeId === you && room.phase === "answering" && connected;

const answerHint = (ready: boolean) =>
  ready
    ? "Enter to pass. A repeat or wrong answer keeps the heat on you."
    : "Your prepared answer stays private until your turn starts.";

const turnMessage = (room: RoomView, alive: boolean, active: boolean) => {
  if (!alive) return "You're spectating. Cheer on the survivors!";
  if (room.phase === "charred") return "Ouch! A fresh vegetable is on its way.";
  const name =
    room.players.find((player) => player.id === room.activeId)?.name ?? "the next gardener";
  if (room.phase === "passing")
    return active ? "Incoming! Get your answer ready…" : `Warming it up for ${name}…`;
  return active ? "Your turn! Pick a fresh answer." : `${name} is thinking…`;
};

const heatLabels = {
  cool: "Hands are cool",
  warm: "Hands are heating up",
  hands: "Hands on fire!",
  body: "On fire — pass it!",
  charred: "Charred! One heart lost.",
};
