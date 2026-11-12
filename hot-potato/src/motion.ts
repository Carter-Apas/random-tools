import { useEffect, useState } from "react";

import type { RoomView } from "../shared/types";

export const position = (index: number, total: number, compact = false) => {
  if (compact) return { x: ((index + 0.5) / total) * 100, y: 60 };
  const angle = ((-90 + (360 * index) / total) * Math.PI) / 180;
  const radius = total >= 7 ? 28 : 26;
  return { x: 50 + Math.cos(angle) * 33, y: 51 + Math.sin(angle) * radius };
};

interface Point {
  x: number;
  y: number;
}

export const passTrajectory = (from: Point, to: Point, progress: number, via?: Point): Point => {
  if (via) {
    const first = progress < 0.45;
    const t = first ? progress / 0.45 : (progress - 0.45) / 0.55;
    return arcPoint(first ? from : via, first ? via : to, t, 10);
  }
  const lift = Math.min(8, Math.hypot(to.x - from.x, to.y - from.y) * 0.2);
  return arcPoint(from, to, progress, lift);
};

const arcPoint = (from: Point, to: Point, progress: number, lift: number): Point => ({
  x: from.x + (to.x - from.x) * progress,
  y: from.y + (to.y - from.y) * progress - Math.sin(progress * Math.PI) * lift,
});

const departure = (room: RoomView, to: Point, compact: boolean, directPass: boolean): Point => {
  const index = room.players.findIndex((player) => player.id === room.move?.from);
  if (index >= 0) return position(index, room.players.length, compact);
  return directPass ? { x: to.x, y: to.y - 14 } : { x: 50, y: 51 };
};

export const vegetablePoint = (
  room: RoomView,
  now: number,
  compact = false,
  directPass = false,
) => {
  const toIndex = room.players.findIndex((player) => player.id === room.activeId);
  const to = position(Math.max(0, toIndex), room.players.length, compact);
  if (
    !room.move ||
    room.phase !== "passing" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return { ...to, scale: 1, rotation: -12 };
  const progress = Math.max(0, Math.min(1, (now - room.move.at) / room.move.duration));
  const from = departure(room, to, compact, directPass);
  return {
    ...passTrajectory(from, to, progress, directPass ? undefined : { x: 50, y: 51 }),
    scale: 0.85 + Math.sin(progress * Math.PI) * 0.35,
    rotation: progress * 360,
  };
};

export const useClock = (serverTime: number): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const offset = serverTime - Date.now();
    const interval = window.setInterval(() => setNow(Date.now() + offset), 40);
    return () => window.clearInterval(interval);
  }, [serverTime]);
  return now;
};
