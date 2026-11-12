import { heatStage } from "../shared/types";
import type { RoomView } from "../shared/types";

export const TurnTimer = ({ room, now }: { room: RoomView; now: number }) => {
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

const heatLabels = {
  cool: "Hands are cool",
  warm: "Hands are heating up",
  hands: "Hands on fire!",
  body: "On fire — pass it!",
  charred: "Charred! One heart lost.",
};
