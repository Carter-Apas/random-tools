import type { CSSProperties } from "react";

import { PlayerFigure } from "./PlayerFigure";
import { position, vegetablePoint } from "./motion";

import type { Player, RoomView } from "../shared/types";

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
}: {
  player: Player;
  index: number;
  total: number;
  active: boolean;
  you: boolean;
  winner: boolean;
  room: RoomView;
  now: number;
}) => {
  const point = position(index, total);
  return (
    <div
      className={`gardener ${active ? "is-active" : ""} ${player.hearts === 0 ? "is-out" : ""}`}
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
}: {
  room: RoomView;
  you: string;
  now: number;
  preview?: boolean;
}) => {
  const visible = room.status === "playing";
  return (
    <div
      className={preview ? "arena arena-preview" : "arena"}
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
          key={player.id}
          player={player}
          index={index}
          total={room.players.length}
          active={visible && room.activeId === player.id}
          you={you === player.id}
          winner={room.winnerId === player.id}
        />
      ))}
      {visible && room.phase === "passing" && <Vegetable room={room} now={now} />}
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

const Vegetable = ({ room, now }: { room: RoomView; now: number }) => {
  const point = vegetablePoint(room, now);
  const vegetable = room.category?.vegetable ?? "potato";
  return (
    <img
      className="hot-vegetable"
      src={`/assets/${vegetable}.png`}
      alt={`Hot ${vegetable}`}
      style={
        {
          left: `${point.x}%`,
          top: `calc(${point.y}% - 8px)`,
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
