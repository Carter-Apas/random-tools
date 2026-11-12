import type { CSSProperties } from "react";

import { heatStage } from "../shared/types";
import type { Player, RoomView } from "../shared/types";

const poseFor = (player: Player, room: RoomView): string => {
  if (player.hearts === 0) return "down";
  if (room.status !== "playing" || room.activeId !== player.id) return "idle";
  return room.phase === "charred" ? "charred" : "hold";
};

export const PlayerFigure = ({
  player,
  room,
  now,
}: {
  player: Player;
  room: RoomView;
  now: number;
}) => {
  const pose = poseFor(player, room);
  const stage = room.activeId === player.id ? heatStage(room, now) : "cool";
  const overlay = stage === "cool" || stage === "charred" ? null : stage;
  const vegetable = room.category?.vegetable ?? "potato";
  const holding = pose === "hold" && room.phase === "answering";
  return (
    <span className={`character-figure heat-${stage}`}>
      <span
        className={`character character-${player.avatar} figure-${pose}`}
        style={{ backgroundImage: `url(/assets/${player.avatar}-${pose}.png)` }}
        role="img"
        aria-label={`${player.avatar} gardener, ${pose === "down" ? "charred and eliminated" : stage}`}
      />
      {holding && (
        <img
          className="held-vegetable"
          src={`/assets/${vegetable}.png`}
          alt={`Holding the ${vegetable}`}
        />
      )}
      {overlay && (
        <span
          className="heat-overlay"
          style={{ backgroundImage: `url(/assets/heat-${overlay}.png)` } as CSSProperties}
          aria-hidden="true"
        />
      )}
    </span>
  );
};
