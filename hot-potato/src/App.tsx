import { useEffect, useRef, useState } from "react";

import { socket, request } from "./connection";
import { Home } from "./Home";
import { Game } from "./Game";
import { usePlayViewport } from "./usePlayViewport";

import type { Pace, Profile, RoomView, TypingUpdate } from "../shared/types";

const Rules = ({ close }: { close: () => void }) => {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      className="rules-dialog panel"
      aria-labelledby="rules-title"
      ref={dialog}
      onClose={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) dialog.current?.close();
      }}
    >
      <button
        className="dialog-close"
        onClick={() => dialog.current?.close()}
        aria-label="Close rules"
      >
        ×
      </button>
      <img className="rules-potato" src="/assets/potato.png" alt="" />
      <h2 id="rules-title">How to not get roasted</h2>
      <ol>
        <li>
          <strong>Pick a fresh answer.</strong> When the hot vegetable reaches you, name something
          that fits the question. No repeats in the current patch. If an answer is wrong, keep
          trying before your turn timer runs out.
        </li>
        <li>
          <strong>Pass it clockwise.</strong> Correct answers send the vegetable to the next
          gardener. Their own random turn timer starts when they receive it.
        </li>
        <li>
          <strong>Watch the vegetable.</strong> A new vegetable means a new question. The patch
          changes after up to six answers, when it runs out, or after someone gets roasted.
        </li>
        <li>
          <strong>Keep your hearts.</strong> Hot hands turn into burning hands, then full-body
          flames. Running out of time costs one heart. Lose all three and you stay charred on the
          ground. Last gardener standing wins!
        </li>
      </ol>
      <p>
        The host can start another round. Practice gardeners are bots, so you can play solo too.
      </p>
      <button className="pixel-button primary" onClick={() => dialog.current?.close()}>
        Got it. Let's grow!
      </button>
    </dialog>
  );
};

const RoomTools = ({ code, leave }: { code: string; leave: () => void }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const url = new URL(location.href);
    url.searchParams.set("room", code);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      window.prompt("Copy this invite link", url.toString());
    }
  };

  return (
    <div className="room-tools">
      <button
        className="room-invite"
        onClick={() => {
          void copy();
        }}
        title="Copy invite link"
      >
        <span>{copied ? "Invite copied!" : "Room code"}</span>
        <strong>{code}</strong>
        <span className="copy-icon" aria-hidden="true">
          ⧉
        </span>
      </button>
      <button className="text-button" onClick={leave}>
        Leave garden
      </button>
    </div>
  );
};

const isPlaying = (room: RoomView | null) => room?.status === "playing";

export const App = () => {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [you, setYou] = useState("");
  const [connected, setConnected] = useState(socket.connected);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rules, setRules] = useState(false);
  const playing = isPlaying(room);
  const shell = usePlayViewport(playing);
  useEffect(() => {
    const connect = () => {
      setConnected(true);
      setError("");
    };

    const disconnect = () => {
      setConnected(false);
    };

    const state = (next: RoomView) => {
      setRoom(next);
      setBusy(false);
    };

    const identity = (id: string) => {
      setYou(id);
    };

    const reset = () => {
      setRoom(null);
      setYou("");
    };

    const typing = (update: TypingUpdate) => {
      setRoom((current) => {
        if (!current || current.phase !== "answering") return current;
        if (current.turn !== update.turn || current.activeId !== update.playerId) return current;
        return { ...current, draft: update.draft };
      });
    };

    socket
      .on("connect", connect)
      .on("disconnect", disconnect)
      .on("state", state)
      .on("typing", typing)
      .on("identity", identity)
      .on("reset", reset);
    socket.connect();
    return () => {
      socket
        .off("connect", connect)
        .off("disconnect", disconnect)
        .off("state", state)
        .off("typing", typing)
        .off("identity", identity)
        .off("reset", reset);
      socket.disconnect();
    };
  }, []);

  const action = async (event: string, data: unknown = {}) => {
    setError("");
    const result = await request(event, data);
    if (!result.ok) setError(result.error ?? "That didn't take root. Try again.");
    if (result.room) setRoom(result.room);
    if (result.playerId) setYou(result.playerId);
  };

  const enter = async (
    mode: "create" | "join" | "practice",
    profile: Profile,
    pace: Pace,
    code: string,
  ) => {
    if (busy) return;
    setBusy(true);
    setError("");
    const result = await request(mode === "join" ? "join" : "create", { profile, pace, code });
    if (!result.ok) {
      setError(result.error ?? "Couldn't enter the garden.");
      setBusy(false);
      return;
    }
    if (result.room) setRoom(result.room);
    if (result.playerId) setYou(result.playerId);
    if (mode === "practice") {
      await action("bot");
      await action("bot");
      await action("start");
    }
    setBusy(false);
  };

  const leave = async () => {
    const result = await request("leave");
    if (!result.ok) {
      setError(result.error ?? "Reconnect before leaving the garden.");
      return;
    }
    setRoom(null);
    setYou("");
    setError("");
    history.replaceState(null, "", location.pathname);
  };

  return (
    <div className={`app-shell ${playing ? "playing-screen" : ""}`} ref={shell}>
      <header className={`site-header ${room ? "in-room" : ""}`}>
        <div className="brand">
          <img src="/assets/potato.png" alt="" />
          <div>
            <h1>
              hot potato<span className="title-dot">!</span>
            </h1>
            <p>Good friends. Fresh answers. Very hot vegetables.</p>
          </div>
        </div>
        <nav aria-label="Game controls">
          {room && (
            <RoomTools
              code={room.code}
              leave={() => {
                void leave();
              }}
            />
          )}
          <button className="how-button" aria-label="How to play" onClick={() => setRules(true)}>
            <svg
              className="help-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-2.9 2-2.9 4" />
              <path d="M12 17h.01" />
            </svg>
            <span>How to play</span>
          </button>
        </nav>
      </header>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}
      {room && !connected && (
        <div className="reconnecting" role="status">
          Connection lost. Rejoining your garden… Your seat is held for 30 seconds.
        </div>
      )}
      {room ? (
        <Game room={room} you={you} connected={connected} onAction={action} />
      ) : (
        <Home
          busy={busy}
          connected={connected}
          onEnter={(...args) => {
            void enter(...args);
          }}
        />
      )}
      <footer className="site-footer">
        <span>
          <img src="/assets/turnip.png" alt="" />A party game, freshly picked.
        </span>
        <span className="footer-note">
          {room ? `Garden ${room.code}` : "Made for friends, near and far."}
        </span>
        <a href="/licenses/data.html" target="_blank" rel="noreferrer">
          Data credits
        </a>
      </footer>
      {rules && <Rules close={() => setRules(false)} />}
    </div>
  );
};
