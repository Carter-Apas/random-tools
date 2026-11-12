import type { CSSProperties } from "react";

import { PlayerFigure } from "./PlayerFigure";
import { position, vegetablePoint } from "./motion";

import type { Player, RoomView } from "../shared/types";

const bubbleSide = (x: number, compact: boolean) => (x >= (compact ? 50 : 65) ? "left" : "right");

const arenaClass = (preview: boolean, compact: boolean) =>
  `arena ${preview ? "arena-preview" : ""} ${compact ? "arena-compact" : ""}`;

export const Hearts = ({ count }: { count: number }) => (
  <span className="hearts" role="img" aria-label={`${count} of 3 hearts`}>
    {[0, 1, 2].map((i) => (
      <img key={i} src={`/assets/heart${i < count ? "" : "-empty"}.png`} alt="" />
    ))}
  </span>
);

const Gardener = ({
  player,
  index,
  total,
  active,
  you,
  winner,
  room,
  now,
  compact,
}: {
  player: Player;
  index: number;
  total: number;
  active: boolean;
  you: boolean;
  winner: boolean;
  room: RoomView;
  now: number;
  compact: boolean;
}) => {
  const point = position(index, total, compact);
  return (
    <div
      className={`gardener ${active ? "is-active" : ""} ${player.hearts === 0 ? "is-out" : ""}`}
      data-speaking={active && room.phase === "answering"}
      style={{ left: `${point.x}%`, top: `${point.y}%` }}
    >
      {winner && <img className="crown" src="/assets/crown.png" alt="Winner" />}
      {active && (
        <span className="turn-pointer" aria-hidden="true">
          ▼
        </span>
      )}
      <PlayerFigure player={player} room={room} now={now} />
      <span className="gardener-name">
        {player.name}
        {you && <span className="you-tag">you</span>}
        {player.bot && <span className="you-tag">bot</span>}
      </span>
      <SpeechBubble room={room} playerId={player.id} side={bubbleSide(point.x, compact)} />
      <Hearts count={player.hearts} />
      {!player.connected && <span className="player-status">Reconnecting…</span>}
      {player.hearts === 0 && <span className="player-status">Spectating</span>}
    </div>
  );
};

export const Arena = ({
  room,
  you,
  now,
  preview = false,
  compact = false,
}: {
  room: RoomView;
  you: string;
  now: number;
  preview?: boolean;
  compact?: boolean;
}) => {
  const visible = room.status === "playing";
  return (
    <div
      className={arenaClass(preview, compact)}
      style={{ "--player-count": room.players.length } as CSSProperties}
      data-player-count={room.players.length}
      aria-label="Garden game board. Play moves clockwise."
    >
      <div className="garden-sign">
        {preview ? "A little garden. A lot of chaos." : `Round ${room.round || 1} · clockwise ↻`}
      </div>
      <div className="firepit">
        <span className="fire-sprite" role="img" aria-label="Campfire" />
      </div>
      {room.players.map((player, index) => (
        <Gardener
          room={room}
          now={now}
          compact={compact}
          key={player.id}
          player={player}
          index={index}
          total={room.players.length}
          active={visible && room.activeId === player.id}
          you={you === player.id}
          winner={room.winnerId === player.id}
        />
      ))}
      {visible && room.phase === "passing" && <Vegetable room={room} now={now} compact={compact} />}
      {preview && (
        <div className="preview-potato">
          <img src="/assets/potato.png" alt="" />
        </div>
      )}
      {room.status === "finished" && <Winner room={room} />}
      <span className="board-caption">
        {preview ? "2–8 friends · 3 hearts · one hot vegetable" : "Fresh answers. Warm hands."}
      </span>
    </div>
  );
};

const Vegetable = ({ room, now, compact }: { room: RoomView; now: number; compact: boolean }) => {
  const point = vegetablePoint(room, now, compact);
  const vegetable = room.category?.vegetable ?? "potato";
  return (
    <img
      className="hot-vegetable"
      src={`/assets/${vegetable}.png`}
      alt={`Hot ${vegetable}`}
      style={
        {
          left: `${point.x}%`,
          top: `calc(${point.y}% - 3px)`,
          "--spin": `${point.rotation}deg`,
          "--scale": point.scale,
        } as CSSProperties
      }
    />
  );
};

const Winner = ({ room }: { room: RoomView }) => (
  <div className="winner-banner">
    <img src="/assets/crown.png" alt="" />
    <strong>
      {room.players.find((player) => player.id === room.winnerId)?.name ?? "Nobody"} wins!
    </strong>
    <span>Last gardener standing.</span>
  </div>
);

const SpeechBubble = ({
  room,
  playerId,
  side,
}: {
  room: RoomView;
  playerId: string;
  side: string;
}) => {
  if (room.status !== "playing" || room.phase !== "answering" || room.activeId !== playerId)
    return null;
  return (
    <div className={`speech-bubble bubble-${side}`}>
      <output aria-label="Live answer" aria-live="off">
        {room.draft || "…"}
      </output>
    </div>
  );
};
