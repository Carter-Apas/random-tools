import { wrapBearing } from "./orientation.js";
import type { ProfileActivity, WindSurface, WindSlice } from "./types.js";

export const defaultWindSurface = (offshore: number, activity: ProfileActivity): WindSurface => {
  const surf = activity === "surfing";
  const values = surf
    ? [
        [
          [0, 25],
          [10, 25],
          [25, 20],
          [40, 8],
          [60, -25],
          [100, -120],
        ],
        [
          [0, 25],
          [10, 15],
          [25, -20],
          [40, -80],
          [60, -180],
          [100, -300],
        ],
        [
          [0, 25],
          [10, 0],
          [25, -100],
          [40, -200],
          [60, -300],
          [100, -500],
        ],
      ]
    : [
        [
          [0, 30],
          [8, 20],
          [15, 0],
          [25, -70],
          [40, -160],
          [100, -300],
        ],
        [
          [0, 30],
          [8, 15],
          [15, -10],
          [25, -100],
          [40, -200],
          [100, -350],
        ],
        [
          [0, 30],
          [8, 10],
          [15, -30],
          [25, -130],
          [40, -250],
          [100, -400],
        ],
      ];
  return {
    enabled: true,
    interpolation: "smooth",
    slices: [0, 90, 180, 270]
      .map((offset): WindSlice => ({
        direction: wrapBearing(offshore + offset),
        curve: {
          variable: "windSpeed",
          enabled: true,
          interpolation: "smooth",
          points: values[[0, 1, 2, 1][offset / 90]].map(([x, y]) => ({ x, y })),
        },
      }))
      .sort((a, b) => a.direction - b.direction),
  };
};
