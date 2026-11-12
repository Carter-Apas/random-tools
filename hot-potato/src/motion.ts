import { useEffect, useState } from "react";

import type { RoomView } from "../shared/types";

export const position = (index: number, total: number) => {
  const angle = ((-90 + (360 * index) / total) * Math.PI) / 180;
  return { x: 50 + Math.cos(angle) * 33, y: 51 + Math.sin(angle) * 26 };
};

export const vegetablePoint = (room: RoomView, now: number) => {
  const toIndex = room.players.findIndex((player) => player.id === room.activeId);
  const to = position(Math.max(0, toIndex), room.players.length);
  if (
    !room.move ||
    room.phase !== "passing" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return { ...to, scale: 1, rotation: -12 };
  const progress = Math.max(0, Math.min(1, (now - room.move.at) / room.move.duration));
  const fromIndex = room.players.findIndex((player) => player.id === room.move?.from);
  const from = fromIndex < 0 ? { x: 50, y: 51 } : position(fromIndex, room.players.length);
  const centre = { x: 50, y: 51 };
  const first = progress < 0.45;
  const t = first ? progress / 0.45 : (progress - 0.45) / 0.55;
  const start = first ? from : centre;
  const end = first ? centre : to;
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t - Math.sin(t * Math.PI) * 10,
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
