import assert from "node:assert/strict";
import { test } from "node:test";

import { passTrajectory, position } from "../src/motion.js";

test("direct hand-offs move from the sender to the recipient without a centre stop", () => {
  for (const compact of [false, true]) {
    for (const [sender, receiver] of [
      [0, 1],
      [7, 0],
    ]) {
      const from = position(sender, 8, compact);
      const to = position(receiver, 8, compact);
      assert.deepEqual(passTrajectory(from, to, 0), from);
      const end = passTrajectory(from, to, 1);
      assert.ok(Math.abs(end.x - to.x) < 0.0001 && Math.abs(end.y - to.y) < 0.0001);
      for (const progress of [0.25, 0.45, 0.5, 0.75]) {
        const point = passTrajectory(from, to, progress);
        const baseline = from.y + (to.y - from.y) * progress;
        assert.equal(point.x, from.x + (to.x - from.x) * progress);
        assert.ok(point.y <= baseline && point.y >= baseline - 8);
      }
    }
  }
});

test("large boards still pass through the campfire before reaching the recipient", () => {
  const from = position(0, 8);
  const to = position(1, 8);
  const fire = { x: 50, y: 51 };
  assert.deepEqual(passTrajectory(from, to, 0.45, fire), fire);
  const incoming = passTrajectory(from, to, 0.725, fire);
  assert.ok(Math.abs(incoming.x - (fire.x + to.x) / 2) < 0.0001);
  assert.ok(Math.abs(incoming.y - ((fire.y + to.y) / 2 - 10)) < 0.0001);
});
