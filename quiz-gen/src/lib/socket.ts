import { io, type Socket } from "socket.io-client";

export type ClientSocketLike = Pick<
  Socket,
  "connected" | "connect" | "disconnect" | "on" | "off" | "emit"
>;

let socket: ClientSocketLike | null = null;

export function getSocket(): ClientSocketLike {
  if (!socket) {
    socket = io({
      autoConnect: false,
    });
  }

  return socket;
}
