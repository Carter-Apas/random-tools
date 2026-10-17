import { useEffect, useState } from "react";

type TimerBarProps = {
  startedAt: number | null;
  endsAt: number | null;
  isActive?: boolean;
  label?: string;
};

export function TimerBar({
  startedAt,
  endsAt,
  isActive = true,
  label = "Round timer",
}: TimerBarProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isActive || !endsAt || !startedAt) {
      return;
    }

    let frame = 0;
    const tick = () => {
      const next = Date.now();
      setNow(next >= endsAt ? endsAt : next);

      if (next >= endsAt) {
        return;
      }

      frame = window.requestAnimationFrame(tick);
    };

    setNow(Date.now());
    frame = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frame);
  }, [endsAt, isActive, startedAt]);

  if (!isActive || !endsAt || !startedAt) {
    return null;
  }

  const remaining = Math.max(0, endsAt - now);
  const duration = Math.max(1, endsAt - startedAt);
  const progress = Math.max(0, Math.min(1, remaining / duration));

  return (
    <div className={`timer ${progress < 0.25 ? "timer-urgent" : ""}`}>
      <div className="timer-label">
        <span>{label}</span>
        <span>{Math.ceil(remaining / 1000)}s</span>
      </div>
      <div
        className="timer-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.ceil(duration / 1000)}
        aria-valuenow={Math.ceil(remaining / 1000)}
      >
        <div
          className="timer-fill"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}
