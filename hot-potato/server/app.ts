import express from "express";
import { Server } from "socket.io";
import type { Socket } from "socket.io";

import { resolve } from "node:path";
import { createServer } from "node:http";

import { publicRoom, startGame, submitAnswer, tickGame, updateDraft } from "./game.js";
import type { Room } from "./game.js";
import { parsePace, parseProfile, Rooms } from "./rooms.js";

import type { Reply } from "../shared/types.js";

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const respond = (ack: unknown, result: Reply): void => {
  if (typeof ack === "function") (ack as (reply: Reply) => void)(result);
};

export const createApp = (staticDirectory = resolve("dist/client")) => {
  const app = express();
  app.disable("x-powered-by");
  app.get("/healthz", (_req, res) => res.json({ status: "ok" }));
  app.use(express.static(staticDirectory));
  app.get("/{*path}", (_req, res) => res.sendFile(resolve(staticDirectory, "index.html")));
  const http = createServer(app);
  const io = new Server(http, { maxHttpBufferSize: 4096, pingTimeout: 15000 });
  const rooms = new Rooms();
  const sockets = new Map<string, Socket>();

  const broadcast = (room: Room): void => {
    io.to(room.code).emit("state", publicRoom(room, Date.now()));
  };

  io.use((socket, next) => {
    const token: unknown = socket.handshake.auth.token;
    if (typeof token !== "string" || !/^[a-zA-Z0-9-]{30,80}$/.test(token))
      return next(new Error("Invalid garden session."));
    next();
  });
  io.on("connection", (socket) => {
    const token = socket.handshake.auth.token as string;
    const previous = sockets.get(token);
    sockets.set(token, socket);
    previous?.disconnect(true);
    const resumed = rooms.reconnect(token);
    if (resumed) {
      void socket.join(resumed.code);
      socket.emit("identity", rooms.require(token).player.id);
      broadcast(resumed);
    } else socket.emit("reset");
    let budget = 20;
    let refill = Date.now();

    const action = (event: string, handler: (data: Record<string, unknown>) => Room): void => {
      socket.on(event, (raw: unknown, ack: unknown) => {
        const now = Date.now();
        budget = Math.min(20, budget + (now - refill) / 500);
        refill = now;
        if (budget < 1)
          return respond(ack, { ok: false, error: "Give the garden a moment, then try again." });
        budget -= 1;
        try {
          const room = handler(record(raw));
          const { player } = rooms.require(token);
          void socket.join(room.code);
          respond(ack, { ok: true, room: publicRoom(room, now), playerId: player.id });
          broadcast(room);
        } catch (error) {
          const member = rooms.membership.get(token);
          if (member) broadcast(member.room);
          respond(ack, {
            ok: false,
            error: error instanceof Error ? error.message : "That didn't take root. Try again.",
          });
        }
      });
    };

    action("create", (data) =>
      rooms.create(token, parseProfile(data.profile), parsePace(data.pace), Date.now()),
    );
    action("join", (data) =>
      rooms.join(token, String(data.code ?? ""), parseProfile(data.profile), Date.now()),
    );
    action("start", () => {
      const room = rooms.host(token);
      startGame(room, Date.now());
      return room;
    });
    action("bot", () => rooms.addBot(token));
    action("pace", (data) => {
      const room = rooms.host(token);
      if (room.status === "playing") throw new Error("Change the pace between rounds.");
      room.pace = parsePace(data.pace);
      return room;
    });
    action("answer", (data) => {
      const { room, player } = rooms.require(token);
      tickGame(room, Date.now());
      if (typeof data.answer !== "string" || data.answer.length > 100)
        throw new Error("Keep your answer under 100 characters.");
      submitAnswer(room, player.id, data.answer, Number(data.turn), Date.now());
      return room;
    });
    let nextTypingAt = 0;
    socket.on("typing", (raw: unknown) => {
      const now = Date.now();
      if (now < nextTypingAt) return;
      nextTypingAt = now + 40;
      const member = rooms.membership.get(token);
      const data = record(raw);
      if (!member || typeof data.draft !== "string") return;
      if (updateDraft(member.room, member.player.id, data.draft, Number(data.turn), now)) {
        io.to(member.room.code).emit("typing", {
          playerId: member.player.id,
          turn: member.room.turn,
          draft: member.room.draft,
        });
      }
    });
    socket.on("leave", (_raw: unknown, ack: unknown) => {
      const member = rooms.membership.get(token);
      if (member) {
        void socket.leave(member.room.code);
        const room = rooms.remove(token, Date.now());
        if (room) broadcast(room);
      }
      respond(ack, { ok: true });
    });
    socket.on("disconnect", () => {
      if (sockets.get(token) !== socket) return;
      sockets.delete(token);
      const room = rooms.disconnect(token, Date.now());
      if (room) broadcast(room);
    });
  });
  const interval = setInterval(() => {
    for (const room of rooms.tick(Date.now())) broadcast(room);
  }, 100);
  interval.unref();
  return {
    app,
    http,
    io,
    rooms,
    close: async () => {
      clearInterval(interval);
      await io.close();
    },
  };
};
