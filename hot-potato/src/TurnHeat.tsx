import type { CSSProperties } from "react";

import type { RoomView } from "../shared/types";

export const TurnHeat = ({
  room,
  you,
  now,
  connected,
}: {
  room: RoomView;
  you: string;
  now: number;
  connected: boolean;
}) => {
  const active = connected && room.activeId === you && room.phase === "answering";
  const progress = Math.max(
    0,
    Math.min(1, (now - room.turnStartedAt + room.penaltyMs) / Math.max(1, room.turnDurationMs)),
  );

  return (
    <div
      className="turn-heat"
      data-active={active}
      style={{ "--turn-heat-progress": progress } as CSSProperties}
      aria-hidden="true"
    />
  );
};
