import test from "node:test";
import assert from "node:assert/strict";
import {
  PE_SIZES,
  convertLength,
  peToDiameter,
  diameterToPe,
  toDiameter,
  estimateCapacity,
} from "../public/model.js";

const close = (actual, expected, tolerance = 1e-9) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} should equal ${expected}`,
  );

test("capacity follows cross-sectional area rather than diameter alone", () => {
  close(estimateCapacity(200, 0.2, 0.2), 200);
  close(estimateCapacity(200, 0.2, 0.1), 800);
  close(estimateCapacity(200, 0.2, 0.4), 50);
  close(estimateCapacity(200, 0.2, 0.16), 312.5);
});

test("yards convert exactly to metres and reverse without changing physical capacity", () => {
  close(convertLength(100, "yd", "m"), 91.44);
  close(convertLength(91.44, "m", "yd"), 100);
  const metres = estimateCapacity(convertLength(200, "yd", "m"), 0.2, 0.16);
  close(metres, 285.75);
  close(convertLength(metres, "m", "yd"), 312.5);
});

test("all PE reference entries round trip, including both endpoints", () => {
  for (const [pe, diameter] of PE_SIZES) {
    close(peToDiameter(pe), diameter);
    close(diameterToPe(diameter), pe);
    close(toDiameter(pe, "pe"), diameter);
  }
});

test("custom PE sizes interpolate area and invert consistently", () => {
  const diameter = peToDiameter(1.1);
  close(diameter ** 2, (0.171 ** 2 + 0.191 ** 2) / 2);
  close(diameterToPe(diameter), 1.1);
  close(
    estimateCapacity(300, toDiameter(2, "pe"), toDiameter(1, "pe")),
    300 * (0.242 / 0.171) ** 2,
  );
});

test("PE estimates never extrapolate outside the reference range", () => {
  assert.throws(() => peToDiameter(0.09), RangeError);
  assert.throws(() => peToDiameter(31), RangeError);
  assert.equal(diameterToPe(0.01), null);
  assert.equal(diameterToPe(1), null);
});

test("invalid values cannot produce misleading capacities", () => {
  for (const value of [0, -1, NaN, Infinity, "200"]) {
    assert.throws(() => estimateCapacity(value, 0.2, 0.16), RangeError);
    assert.throws(() => estimateCapacity(200, value, 0.16), RangeError);
    assert.throws(() => estimateCapacity(200, 0.2, value), RangeError);
    assert.throws(() => convertLength(value, "m", "yd"), RangeError);
  }
  assert.throws(() => estimateCapacity(Number.MAX_VALUE, 5, 0.01), RangeError);
  assert.throws(() => convertLength(200, "feet", "m"), RangeError);
  assert.throws(() => toDiameter(0.2, "lb"), RangeError);
  assert.throws(() => toDiameter(0.001, "mm"), RangeError);
  assert.throws(() => toDiameter(6, "mm"), RangeError);
});
