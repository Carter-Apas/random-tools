import { useState } from "react";

import { Arena } from "./Arena";

import type { Avatar, Pace, Profile, RoomView } from "../shared/types";
import { paces } from "../shared/types";
const previewRoom: RoomView = {
  code: "",
  hostId: "0",
  players: [
    { id: "0", name: "You", avatar: "male", hearts: 3, connected: true, bot: false },
    { id: "1", name: "Basil", avatar: "female", hearts: 3, connected: true, bot: true },
    { id: "2", name: "Clover", avatar: "male", hearts: 3, connected: true, bot: true },
    { id: "3", name: "Poppy", avatar: "female", hearts: 3, connected: true, bot: true },
  ],
  status: "lobby",
  phase: "answering",
  pace: "classic",
  round: 0,
  turn: 0,
  activeId: null,
  winnerId: null,
  category: null,
  used: [],
  categoryGoal: 0,
  deadline: 0,
  turnDurationMs: 0,
  turnStartedAt: 0,
  draft: "",
  move: null,
  events: [],
  serverTime: 0,
};

const savedProfile = (): Profile => {
  try {
    const raw = JSON.parse(localStorage.getItem("hot-potato.profile") ?? "null") as Profile | null;
    if (raw && typeof raw.name === "string")
      return { name: raw.name, avatar: raw.avatar === "female" ? "female" : "male" };
  } catch {
    return { name: "", avatar: "male" };
  }
  return { name: "", avatar: "male" };
};

export const Home = ({
  onEnter,
  busy,
  connected,
}: {
  onEnter: (
    mode: "create" | "join" | "practice",
    profile: Profile,
    pace: Pace,
    code: string,
  ) => void;
  busy: boolean;
  connected: boolean;
}) => {
  const [profile, setProfile] = useState(savedProfile);
  const [pace, setPace] = useState<Pace>("classic");
  const [code, setCode] = useState(
    () => new URLSearchParams(location.search).get("room")?.toUpperCase() ?? "",
  );

  const enter = (mode: "create" | "join" | "practice") => {
    if (!profile.name.trim()) {
      document.querySelector<HTMLInputElement>("#player-name")?.focus();
      return;
    }
    try {
      localStorage.setItem("hot-potato.profile", JSON.stringify(profile));
    } catch {
      console.info("Profile will last for this visit.");
    }
    onEnter(mode, profile, pace, code);
  };

  const choose = (avatar: Avatar) => {
    setProfile({ ...profile, avatar });
  };

  return (
    <main className="home-layout">
      <section className="panel profile-panel" aria-labelledby="profile-title">
        <h2 id="profile-title">Meet your gardener</h2>
        <label htmlFor="player-name">Your name</label>
        <input
          id="player-name"
          autoComplete="nickname"
          maxLength={16}
          placeholder="What do we call you?"
          value={profile.name}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") enter("create");
          }}
        />
        <fieldset className="avatar-picker">
          <legend>Pick your little human</legend>
          {(["male", "female"] as const).map((avatar) => (
            <button
              type="button"
              className={`avatar-option ${profile.avatar === avatar ? "selected" : ""}`}
              key={avatar}
              onClick={() => choose(avatar)}
              aria-pressed={profile.avatar === avatar}
            >
              <span className={`character character-${avatar}`} />
              <span>{avatar === "male" ? "Boy" : "Girl"}</span>
              {profile.avatar === avatar && (
                <span className="selected-tick" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </fieldset>
        <label htmlFor="pace">How hot?</label>
        <select id="pace" value={pace} onChange={(e) => setPace(e.target.value as Pace)}>
          {Object.entries(paces).map(([value, item]) => (
            <option value={value} key={value}>
              {item.label} · {item.min / 1000}–{item.max / 1000}s turns
            </option>
          ))}
        </select>
        <button
          className="pixel-button primary host-button"
          disabled={busy || !connected}
          onClick={() => enter("create")}
        >
          <img src="/assets/potato.png" alt="" />
          Host a garden
        </button>
        <div className="join-divider">
          <span>Got an invite?</span>
        </div>
        <form
          className="join-form"
          onSubmit={(e) => {
            e.preventDefault();
            enter("join");
          }}
        >
          <label htmlFor="room-code" className="sr-only">
            Room code
          </label>
          <input
            id="room-code"
            placeholder="CODE"
            maxLength={5}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
            autoCapitalize="characters"
            autoComplete="off"
          />
          <button className="pixel-button" disabled={busy || !connected || code.length !== 5}>
            Join
          </button>
        </form>
        <button
          className="practice-link"
          disabled={busy || !connected}
          onClick={() => enter("practice")}
        >
          Flying solo? Practise with bots
        </button>
        {!connected && (
          <p className="connection-note" role="status">
            Connecting to the garden…
          </p>
        )}
      </section>
      <section className="home-garden">
        <Arena
          room={{
            ...previewRoom,
            players: previewRoom.players.map((player, index) =>
              index === 0
                ? { ...player, avatar: profile.avatar, name: profile.name || "You" }
                : player,
            ),
          }}
          you=""
          now={0}
          preview
        />
        <div className="how-strip">
          <div>
            <img src="/assets/carrot.png" alt="" />
            <p>
              <strong>Think fresh.</strong>
              <span>Name something in the category.</span>
            </p>
          </div>
          <div>
            <img src="/assets/fire-still.png" alt="" />
            <p>
              <strong>Pass it quick.</strong>
              <span>A fresh timer for every turn.</span>
            </p>
          </div>
          <div>
            <img src="/assets/heart.png" alt="" />
            <p>
              <strong>Stay unroasted.</strong>
              <span>Three hearts. Last one wins.</span>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};
