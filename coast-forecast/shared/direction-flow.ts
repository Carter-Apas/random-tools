import { destination, wrapBearing } from "./orientation.js";
import type { Coordinate } from "./orientation.js";

export const incomingFlow = (origin: Coordinate, from: number, length: number) => {
  const direction = wrapBearing(from);
  const source = destination(origin, direction, length);
  const tip = destination(origin, direction, 90);
  return {
    source,
    tip,
    wings: [destination(tip, direction - 30, 180), destination(tip, direction + 30, 180)],
  };
};
