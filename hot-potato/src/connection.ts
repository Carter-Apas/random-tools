import { io } from "socket.io-client";

import type { Reply } from "../shared/types";

const newToken = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(24)), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");

const sessionToken = (): string => {
  try {
    const saved = sessionStorage.getItem("hot-potato.session");
    if (saved) return saved;
    const token = newToken();
    sessionStorage.setItem("hot-potato.session", token);
    return token;
  } catch {
    return newToken();
  }
};

export const socket = io({ autoConnect: false, auth: { token: sessionToken() } });

export const request = (event: string, data: unknown = {}): Promise<Reply> =>
  new Promise((resolve) => {
    if (!socket.connected) {
      resolve({ ok: false, error: "Reconnecting to the garden. Try again in a moment." });
      return;
    }
    socket.timeout(6000).emit(event, data, (error: Error | null, reply: Reply) => {
      resolve(
        error ? { ok: false, error: "The garden didn't reply. Reconnecting may help." } : reply,
      );
    });
  });
