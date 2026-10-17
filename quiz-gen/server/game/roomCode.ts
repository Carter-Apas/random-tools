export const roomCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const roomCodeLength = 4;

export function normalizeRoomCode(input: string) {
  return input.replace(/\s+/g, "").toUpperCase();
}

export function createRoomCode(random = Math.random) {
  return Array.from({ length: roomCodeLength }, () => {
    const index = Math.floor(random() * roomCodeAlphabet.length);
    return roomCodeAlphabet[index];
  }).join("");
}
