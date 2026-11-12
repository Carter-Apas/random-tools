import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { request, socket } from "./connection";

import type { RoomView } from "../shared/types";

export const AnswerBox = ({
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
    if (ready) input.current?.focus({ preventScroll: true });
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
    input.current?.focus({ preventScroll: true });
    const submitted = answer.trim();
    setSending(true);
    const result = await request("answer", { answer: submitted, turn: room.turn });
    setSending(false);
    if (result.ok) setAnswer((current) => (current.trim() === submitted ? "" : current));
    else {
      setFailure({ turn: room.turn, message: result.error ?? "Wrong answer. Try again!" });
      if (document.activeElement === input.current && input.current?.value.trim() === submitted)
        input.current.select();
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
          aria-invalid={Boolean(error)}
          aria-describedby="current-question answer-feedback"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={100}
          placeholder={ready ? "Type your answer…" : "Prepare an answer privately…"}
          enterKeyHint="send"
        />
        <button
          className="pixel-button primary"
          disabled={!ready || !answer.trim() || sending}
          onPointerDown={(event) => {
            event.preventDefault();
            input.current?.focus({ preventScroll: true });
          }}
        >
          Pass it! <span aria-hidden="true">↻</span>
        </button>
      </form>
      <p id="answer-feedback" className="answer-feedback" role="status">
        {error || answerHint(ready)}
      </p>
    </div>
  );
};

const hasHearts = (room: RoomView, you: string) =>
  (room.players.find((player) => player.id === you)?.hearts ?? 0) > 0;

const canAnswer = (room: RoomView, you: string, connected: boolean) =>
  room.activeId === you && room.phase === "answering" && connected;

const answerHint = (ready: boolean) =>
  ready
    ? "Enter to pass. Check your spelling and try again if needed."
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
