import assert from "node:assert/strict";
import { test } from "node:test";

import { drawCurveSection } from "../shared/curve-editing.js";
import { parseCurve } from "../shared/config-validation.js";
import { makeCurve } from "../shared/scoring-config.js";

test("freehand drawing replaces only its section and preserves the exact end of the stroke", () => {
  const base = makeCurve("windSpeed", [
    [0, 20],
    [10, 15],
    [50, -100],
    [100, -200],
  ]);
  const stroke = Array.from({ length: 250 }, (_, index) => ({
    x: 20 + (index / 249) * 20,
    y: -10 - index,
  }));
  const next = drawCurveSection(base, stroke);
  assert.deepEqual(
    next.points.filter((point) => point.x < 20 || point.x > 40),
    base.points,
  );
  assert.ok(next.points.some((point) => point.x === 20));
  assert.ok(next.points.some((point) => point.x === 40 && point.y === -259));
  assert.doesNotThrow(() => parseCurve(next));
  assert.equal(base.points.length, 4);
});

test("reverse-direction strokes are sorted and circular endpoints stay joined", () => {
  const base = makeCurve("windDirection", [
    [0, 20],
    [180, -100],
    [360, 20],
  ]);
  const next = drawCurveSection(base, [
    { x: 360, y: -200 },
    { x: 330, y: -100 },
    { x: 300, y: 20 },
  ]);
  assert.equal(next.points[0].y, -200);
  assert.equal(next.points.at(-1)!.y, -200);
  assert.doesNotThrow(() => parseCurve(next));
  const north = drawCurveSection(base, [
    { x: 0, y: 50 },
    { x: 40, y: -80 },
  ]);
  assert.equal(north.points.at(-1)!.y, 50);
  assert.doesNotThrow(() => parseCurve(north));
});

test("single-point strokes keep the original, and full curves refuse extra detail without corrupting it", () => {
  const base = makeCurve("windSpeed", [
    [0, 10],
    [100, -100],
  ]);
  assert.deepEqual(drawCurveSection(base, [{ x: 5, y: 10 }]), base);
  const full = {
    ...base,
    points: Array.from({ length: 256 }, (_, index) => ({ x: (index / 255) * 100, y: index })),
  };
  assert.throws(
    () =>
      drawCurveSection(full, [
        { x: 0.01, y: 10 },
        { x: 0.02, y: 20 },
      ]),
    /256 points/,
  );
  assert.equal(full.points.length, 256);
});
