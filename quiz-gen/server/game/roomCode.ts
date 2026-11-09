export const roomCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const roomCodeLength = 4;

export const normalizeRoomCode = (input: string) => input.replace(/\s+/g, "").toUpperCase();

export const createRoomCode = (random = Math.random) =>
  Array.from({ length: roomCodeLength }, () => {
    const index = Math.floor(random() * roomCodeAlphabet.length);
    return roomCodeAlphabet[index];
  }).join("");
