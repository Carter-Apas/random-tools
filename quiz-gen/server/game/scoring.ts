type ScoreInput = {
  isCorrect: boolean;
  answeredAtMs: number;
  durationMs: number;
};

export function calculateScore(input: ScoreInput) {
  if (!input.isCorrect) {
    return 0;
  }

  const clamped = Math.max(0, Math.min(input.answeredAtMs, input.durationMs));
  const ratio = 1 - clamped / input.durationMs;
  return Math.max(100, Math.round(100 + ratio * 900));
}
