import { randomInt } from "node:crypto";

import {
  addEvent,
  finishIfWon,
  gameError,
  makeMember,
  makeRoom,
  nextPlayer,
  passTo,
  tickGame,
} from "./game.js";
import type { Member, Room } from "./game.js";

import type { Pace, Profile } from "../shared/types.js";

export const parseProfile = (value: unknown): Profile => {
  if (!value || typeof value !== "object") gameError("Choose a name and gardener.");
  const data = value as Record<string, unknown>;
  if (typeof data.name !== "string") gameError("Give your gardener a name.");
  const name = data.name.trim().replace(/\s+/g, " ").slice(0, 16);
  if (!name) gameError("Give your gardener a name.");
  if (data.avatar !== "male" && data.avatar !== "female") gameError("Choose a gardener.");
  return { name, avatar: data.avatar };
};

export const parsePace = (value: unknown): Pace => {
  if (value !== "gentle" && value !== "classic" && value !== "spicy")
    gameError("Choose a valid pace.");
  return value;
};

const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export class Rooms {
  readonly rooms = new Map<string, Room>();
  readonly membership = new Map<
    string,
    {
      room: Room;
      player: Member;
    }
  >();
  create(token: string, profile: Profile, pace: Pace, now: number): Room {
    if (this.membership.has(token)) gameError("Leave your current garden first.");
    if (this.rooms.size >= 500) gameError("The garden is full. Try again in a little while.");
    let code: string;
    do {
      code = Array.from({ length: 5 }, () => letters[randomInt(letters.length)]).join("");
    } while (this.rooms.has(code));
    const player = makeMember(profile, token);
    const room = makeRoom(code, player, pace, now);
    this.rooms.set(code, room);
    this.membership.set(token, { room, player });
    return room;
  }
  join(token: string, code: string, profile: Profile, now: number): Room {
    if (this.membership.has(token)) gameError("Leave your current garden first.");
    const room = this.rooms.get(code.toUpperCase());
    if (!room) gameError("Garden not found. Check your five-letter room code.");
    if (room.status === "playing") gameError("This round has started. Join when it finishes.");
    if (room.players.length >= 8) gameError("This garden has all eight gardeners.");
    if (room.players.some((player) => player.name.toLowerCase() === profile.name.toLowerCase()))
      gameError("That name is taken in this garden. Choose another.");
    const player = makeMember(profile, token);
    room.players.push(player);
    room.updatedAt = now;
    this.membership.set(token, { room, player });
    return room;
  }
  require(token: string): {
    room: Room;
    player: Member;
  } {
    return this.membership.get(token) ?? gameError("Join a garden first.");
  }
  host(token: string): Room {
    const { room, player } = this.require(token);
    if (room.hostId !== player.id) gameError("Only the host can do that.");
    return room;
  }
  addBot(token: string): Room {
    const room = this.host(token);
    if (room.status === "playing") gameError("Add gardeners between rounds.");
    if (room.players.length >= 8) gameError("The garden is full.");
    const names = ["Basil", "Clover", "Poppy", "Sage", "Fern", "Olive", "Dill"];
    const name =
      names.find((item) => !room.players.some((player) => player.name === item)) ?? "Sprout";
    room.players.push(
      makeMember(
        { name, avatar: room.players.length % 2 ? "female" : "male" },
        `bot-${name}`,
        true,
      ),
    );
    return room;
  }
  remove(token: string, now: number): Room | undefined {
    const member = this.membership.get(token);
    if (!member) return undefined;
    const { room, player } = member;
    this.membership.delete(token);
    const previousIndex = room.players.indexOf(player);
    const next = nextPlayer(room, player.id);
    room.players.splice(previousIndex, 1);
    this.migrateHost(room);
    room.updatedAt = now;
    addEvent(room, "leave", `${player.name} left the garden.`);
    if (room.status === "playing" && !finishIfWon(room) && room.activeId === player.id && next)
      passTo(room, next, now, player.id);
    if (!room.players.some((item) => !item.bot)) this.deleteRoom(room);
    return room;
  }
  disconnect(token: string, now: number): Room | undefined {
    const member = this.membership.get(token);
    if (!member) return undefined;
    member.player.connected = false;
    if (member.room.activeId === member.player.id) member.room.draft = "";
    member.player.disconnectedAt = now;
    this.migrateHost(member.room);
    return member.room;
  }
  reconnect(token: string): Room | undefined {
    const member = this.membership.get(token);
    if (!member) return undefined;
    member.player.connected = true;
    member.player.disconnectedAt = null;
    return member.room;
  }
  migrateHost(room: Room): void {
    if (room.players.some((player) => player.id === room.hostId && player.connected)) return;
    const next = room.players.find((player) => player.connected && !player.bot);
    if (next) room.hostId = next.id;
  }
  deleteRoom(room: Room): void {
    this.rooms.delete(room.code);
    for (const player of room.players) this.membership.delete(player.token);
  }
  tick(now: number): Room[] {
    const changed = new Set<Room>();
    for (const room of this.rooms.values()) {
      for (const player of [...room.players]) {
        if (player.disconnectedAt !== null && now - player.disconnectedAt >= 30000) {
          this.remove(player.token, now);
          changed.add(room);
        }
      }
      if (now - room.updatedAt > 3600000) {
        this.deleteRoom(room);
        continue;
      }
      if (tickGame(room, now)) changed.add(room);
    }
    return [...changed];
  }
}
