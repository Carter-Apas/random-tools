import { useLayoutEffect, useRef, useState } from "react";

import { Arena } from "./Arena";
import { AnswerBox } from "./AnswerBox";
import { TurnTimer } from "./TurnTimer";
import { TurnHeat } from "./TurnHeat";
import { useClock } from "./motion";

import type { QuestionView, RoomView } from "../shared/types";
import { paces } from "../shared/types";

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
  if (playing && room.question)
    return <Play room={room} question={room.question} you={you} now={now} connected={connected} />;
  return (
    <main className="game-layout">
      <div className="game-main">
        <Arena room={room} you={you} now={now} />
        <div className="garden-log" aria-live="polite" aria-atomic="true">
          <span className="log-flower" aria-hidden="true">
            ✿
          </span>
          {room.events.at(-1)?.text ?? "Everyone starts with three hearts. Make them count."}
        </div>
      </div>
      <aside className="game-sidebar">
        <Lobby room={room} host={room.hostId === you} onAction={onAction} />
        <div className="table-rules">
          <span>
            <img src="/assets/heart.png" alt="" />
            Three hearts each
          </span>
          <span>
            <img src="/assets/carrot.png" alt="" />
            Rotating questions
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

const Play = ({
  room,
  question,
  you,
  now,
  connected,
}: {
  room: RoomView;
  question: QuestionView;
  you: string;
  now: number;
  connected: boolean;
}) => {
  const field = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ compact: false, directPass: false });
  useLayoutEffect(() => {
    const element = field.current;
    if (!element) return;

    const update = () => {
      const compact = element.clientHeight < 240;
      const directPass = compact || element.clientWidth <= 600;
      setLayout((current) =>
        current.compact === compact && current.directPass === directPass
          ? current
          : { compact, directPass },
      );
    };

    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, []);
  return (
    <main className="play-layout">
      <TurnHeat room={room} you={you} now={now} connected={connected} />
      <section className="panel play-question" aria-labelledby="current-question">
        <div className="play-topic">
          <img src={`/assets/${question.vegetable}.png`} alt="" />
          <span>{question.name}</span>
        </div>
        <h2 id="current-question" key={question.id}>
          {question.prompt}
        </h2>
        <QuestionDetails room={room} />
        <TurnTimer room={room} now={now} />
      </section>
      <div className="play-field" ref={field}>
        <Arena
          room={room}
          you={you}
          now={now}
          compact={layout.compact}
          directPass={layout.directPass}
        />
      </div>
      <section className="play-picks" aria-label="Already picked">
        <div className="picked-heading">
          <strong>Already picked</strong>
          <span>
            {room.used.length} / {room.questionGoal}
          </span>
        </div>
        <div className="picked-answers">
          {room.used.length ? (
            room.used.map((answer) => <span key={answer}>{answer}</span>)
          ) : (
            <p>A fresh patch. Any answer is yours!</p>
          )}
        </div>
        <p className="play-last-pick">{room.events.at(-1)?.text}</p>
      </section>
      <AnswerBox key={room.round} room={room} you={you} connected={connected} />
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {room.events.at(-1)?.text}
      </div>
    </main>
  );
};

const QuestionDetails = ({ room }: { room: RoomView }) => {
  const dialog = useRef<HTMLDialogElement>(null);

  const close = () => {
    dialog.current?.close();
    document.querySelector<HTMLInputElement>("#answer")?.focus({ preventScroll: true });
  };

  return (
    <>
      <button
        type="button"
        className="question-info"
        onClick={() => dialog.current?.showModal()}
        aria-label="Question hint and picked answers"
      >
        <span aria-hidden="true">ⓘ</span>
        <span>
          {room.used.length}/{room.questionGoal} picked
        </span>
      </button>
      <dialog
        className="panel play-details"
        ref={dialog}
        aria-labelledby="question-details-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <button
          type="button"
          className="dialog-close"
          onClick={close}
          aria-label="Close question details"
        >
          ×
        </button>
        <h2 id="question-details-title">{room.question?.prompt}</h2>
        <p>{room.question?.hint}</p>
        <h3>Already picked</h3>
        <div className="picked-answers">
          {room.used.length ? (
            room.used.map((answer) => <span key={answer}>{answer}</span>)
          ) : (
            <p>No answers picked yet.</p>
          )}
        </div>
        <p>
          New question after {room.questionGoal} fresh answers or a roast. Each player gets a fresh
          timer.
        </p>
        <button type="button" className="pixel-button primary" onClick={close}>
          Back to the garden
        </button>
      </dialog>
    </>
  );
};
