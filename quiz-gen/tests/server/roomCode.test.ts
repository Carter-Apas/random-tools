import { describe, expect, it } from "vitest";
import {
  normalizeRoomCode,
  roomCodeAlphabet,
  roomCodeLength,
} from "../../server/game/roomCode";

describe("roomCode", () => {
  it("normalizes room codes to uppercase and strips whitespace", () => {
    expect(normalizeRoomCode(" ab c ")).toBe("ABC");
  });

  it("uses a constrained alphabet and fixed length", () => {
    expect(roomCodeLength).toBe(4);
    expect(roomCodeAlphabet).toMatch(/^[A-Z]+$/);
  });
});
