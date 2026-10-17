import { describe, expect, it } from "vitest";
import { calculateScore } from "../../server/game/scoring";

describe("calculateScore", () => {
  it("awards more points for earlier correct answers", () => {
    const fast = calculateScore({
      isCorrect: true,
      answeredAtMs: 1000,
      durationMs: 15000,
    });
    const slow = calculateScore({
      isCorrect: true,
      answeredAtMs: 12000,
      durationMs: 15000,
    });

    expect(fast).toBeGreaterThan(slow);
    expect(slow).toBeGreaterThan(0);
  });

  it("awards zero for incorrect answers", () => {
    expect(
      calculateScore({
        isCorrect: false,
        answeredAtMs: 1000,
        durationMs: 15000,
      }),
    ).toBe(0);
  });
});
