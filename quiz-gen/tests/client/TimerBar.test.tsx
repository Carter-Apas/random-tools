import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimerBar } from "../../src/components/TimerBar";

describe("TimerBar", () => {
  const originalNow = Date.now;
  const originalRaf = window.requestAnimationFrame;
  const originalCancel = window.cancelAnimationFrame;

  beforeEach(() => {
    vi.useFakeTimers();
    let now = 1000;
    Date.now = () => now;
    window.requestAnimationFrame = (callback: FrameRequestCallback) =>
      window.setTimeout(() => {
        now += 1000;
        callback(now);
      }, 1000);
    window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
  });

  afterEach(() => {
    vi.useRealTimers();
    Date.now = originalNow;
    window.requestAnimationFrame = originalRaf;
    window.cancelAnimationFrame = originalCancel;
  });

  it("updates the visible countdown over time", async () => {
    render(<TimerBar startedAt={1000} endsAt={16000} />);

    expect(screen.getByText("15s")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("14s")).toBeInTheDocument();
  });
});
