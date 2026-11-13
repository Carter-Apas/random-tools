import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { test } from "node:test";

import { createApp } from "../server/app.js";
import type { Reply, RoomView } from "../shared/types.js";

const socketOnce = (socket: Socket, event: string): Promise<unknown[]> =>
  new Promise((resolve) => socket.once(event, (...args: unknown[]) => resolve(args)));

const send = (socket: Socket, event: string, data: unknown = {}): Promise<Reply> =>
  new Promise((resolve) => socket.emit(event, data, resolve));

test("real sockets host, join, enforce host actions, answer, reconnect, and clean up", async () => {
  const server = createApp();
  server.http.listen(0, "127.0.0.1");
  await once(server.http, "listening");
  const address = server.http.address();
  assert.ok(address && typeof address === "object");
  const url = `http://127.0.0.1:${address.port}`;
  const hostToken = randomUUID();
  const guestToken = randomUUID();

  const connect = async (token: string) => {
    const socket = io(url, { auth: { token }, forceNew: true, transports: ["websocket"] });
    await socketOnce(socket, "connect");
    return socket;
  };

  const host = await connect(hostToken);
  let guest = await connect(guestToken);
  try {
    assert.equal((await fetch(`${url}/healthz`)).status, 200);
    const made = await send(host, "create", {
      profile: { name: "Host", avatar: "male" },
      pace: "spicy",
    });
    assert.equal(made.ok, true);
    const joined = await send(guest, "join", {
      code: made.room!.code.toLowerCase(),
      profile: { name: "Friend", avatar: "female" },
    });
    assert.equal(joined.room?.players.length, 2);
    assert.equal((await send(guest, "start")).ok, false);
    const started = await send(host, "start");
    assert.equal(started.room?.status, "playing");
    const internal = server.rooms.rooms.get(made.room!.code)!;
    internal.readyAt = Date.now() - 1;
    internal.phase = "answering";
    const stale = await send(guest, "answer", {
      answer: internal.question!.answers[0].label,
      turn: internal.turn,
    });
    assert.equal(stale.ok, false);
    const visibleDraft = socketOnce(guest, "typing");
    host.emit("typing", { draft: "someone is thinking", turn: internal.turn });
    assert.deepEqual(await visibleDraft, [
      { playerId: made.playerId, turn: internal.turn, draft: "someone is thinking" },
    ]);
    guest.emit("typing", { draft: "private future answer", turn: internal.turn });
    const barrier = await send(guest, "start");
    assert.equal(barrier.ok, false);
    assert.equal(internal.draft, "someone is thinking");
    const answered = await send(host, "answer", {
      answer: internal.question!.answers[0].label,
      turn: internal.turn,
    });
    assert.equal(answered.ok, true);
    assert.equal(answered.room?.activeId, joined.playerId);
    assert.equal(answered.room?.draft, "");
    host.emit("typing", { draft: "late old answer", turn: started.room!.turn });
    await send(host, "pace", { pace: "gentle" });
    assert.equal(internal.draft, "");
    const denied = await send(guest, "join", {
      code: "ABCDE",
      profile: { name: "Other", avatar: "male" },
    });
    assert.equal(denied.ok, false);
    const hostUpdated = socketOnce(host, "state");
    guest.disconnect();
    const [disconnected] = (await hostUpdated) as [RoomView];
    assert.equal(
      disconnected.players.find((player) => player.id === joined.playerId)?.connected,
      false,
    );
    guest = io(url, { auth: { token: guestToken }, forceNew: true, autoConnect: false });
    const identity = socketOnce(guest, "identity");
    const state = socketOnce(guest, "state");
    guest.connect();
    assert.deepEqual(await identity, [joined.playerId]);
    const [resumed] = (await state) as [RoomView];
    assert.equal(resumed.players.find((player) => player.id === joined.playerId)?.connected, true);
    assert.equal((await send(host, "leave")).ok, true);
    assert.equal(internal.hostId, joined.playerId);
    assert.equal(internal.status, "finished");
    assert.equal((await send(guest, "leave")).ok, true);
    assert.equal(server.rooms.rooms.size, 0);
  } finally {
    host.disconnect();
    guest.disconnect();
    await server.close();
  }
});
