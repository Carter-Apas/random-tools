import assert from "node:assert/strict";
import { test } from "node:test";

import { defaultWindSurface } from "../shared/wind-defaults.js";
import { buildMesh, windVertex } from "../src/wind-mesh.js";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} differs from ${expected}`);

test("radial wind geometry uses FROM bearing around the compass and speed as radius", () => {
  const directions = [
    [0, 0, -1],
    [90, 1, 0],
    [180, 0, 1],
    [270, -1, 0],
  ];
  for (const [bearing, x, y] of directions) {
    const vertex = windVertex(10, 100, bearing, -100, 25);
    close(vertex.x, x);
    close(vertex.y, y);
    const calm = windVertex(10, 0, bearing, -100, 25);
    close(calm.x, 0);
    close(calm.y, 0);
  }
  for (let direction = 0; direction < 360; direction += 15) {
    const vertex = windVertex(-20, 40, direction, -100, 25);
    close(Math.hypot(vertex.x, vertex.y), 0.4);
    close(vertex.z, windVertex(-20, 90, direction, -100, 25).z);
  }
  const north = windVertex(20, 100, 0, -100, 25),
    wrapped = windVertex(20, 100, 360, -100, 25);
  close(north.x, wrapped.x);
  close(north.y, wrapped.y);
  close(north.z, wrapped.z);
});

test("radial mesh retains every stored slice and its exact control points", () => {
  const surface = defaultWindSurface(90, "surfing");
  surface.slices.push({
    direction: 123,
    curve: {
      variable: "windSpeed",
      enabled: true,
      interpolation: "linear",
      points: [
        { x: 0, y: 25 },
        { x: 12.345, y: 125 },
        { x: 100, y: -250 },
      ],
    },
  });
  surface.slices.sort((a, b) => a.direction - b.direction);
  const mesh = buildMesh(surface);
  assert.deepEqual(
    mesh.slices.map((slice) => slice.direction),
    surface.slices.map((slice) => slice.direction),
  );
  for (const slice of surface.slices)
    for (const point of slice.curve.points) {
      const expected = windVertex(point.y, point.x, slice.direction, mesh.minimum, mesh.maximum);
      const plotted = mesh.slices
        .find((section) => section.direction === slice.direction)!
        .vertices.find(
          (vertex) => Math.abs(Math.hypot(vertex.x, vertex.y) - point.x / 100) < 1e-8,
        )!;
      close(plotted.points, point.y);
      close(plotted.z, expected.z);
    }
});
