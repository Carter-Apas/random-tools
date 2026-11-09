import assert from "node:assert/strict";
import { test } from "node:test";

import { piha, teArai } from "./fixtures.js";

import { parseCurve, parseProfile } from "../shared/config-validation.js";
import { compileCurve, curveMaximum, evaluateCurve } from "../shared/curves.js";
import { evaluateProfile, simulate } from "../shared/point-scoring.js";
import { makeCurve } from "../shared/scoring-config.js";
import { initialScenario } from "../shared/variables.js";
import type { PointProfile, Spot } from "../shared/types.js";
import { normalizeHour, summarize } from "../server/conditions.js";
import { scoreHour, scenarioFromHour } from "../server/scoring.js";

const inputs = initialScenario();
const linear = {
  ...makeCurve("windSpeed", [
    [0, 20],
    [100, 0],
  ]),
  interpolation: "linear" as const,
};

test("straight lines and steps evaluate exact values and hold endpoint values outside the curve", () => {
  assert.equal(evaluateCurve(linear, 50), 10);
  assert.equal(evaluateCurve(linear, -10), 20);
  assert.equal(evaluateCurve(linear, 150), 0);
  assert.equal(evaluateCurve({ ...linear, interpolation: "step" }, 50), 20);
  assert.equal(evaluateCurve({ ...linear, interpolation: "step" }, 100), 0);
});

test("smooth splines pass through knots without overshooting any segment or its true maximum", () => {
  const curve = makeCurve("windSpeed", [
    [0, -200],
    [0.1, 30],
    [8, -100],
    [40, 100],
    [42, 100],
    [100, 0],
  ]);
  const evaluate = compileCurve(curve);
  for (const point of curve.points) assert.ok(Math.abs(evaluate(point.x) - point.y) < 1e-8);
  for (let index = 0; index < curve.points.length - 1; index++) {
    const a = curve.points[index],
      b = curve.points[index + 1];
    for (let fraction = 0; fraction <= 1; fraction += 0.01) {
      const y = evaluate(a.x + (b.x - a.x) * fraction);
      assert.ok(y >= Math.min(a.y, b.y) - 1e-8 && y <= Math.max(a.y, b.y) + 1e-8);
    }
  }
  assert.equal(curveMaximum(curve), 100);
});

test("score is the signed point total divided by the sum of enabled curve maxima", () => {
  const rain = {
    ...makeCurve("rain", [
      [0, 80],
      [50, 0],
    ]),
    interpolation: "linear" as const,
  };
  const disabled = makeCurve(
    "windGust",
    [
      [0, 1000],
      [150, -1000],
    ],
    false,
  );
  const score = evaluateProfile(
    { curves: [linear, rain, disabled] },
    { ...inputs, windSpeed: 50, rain: 25, windGust: null },
  );
  assert.equal(score.points, 50);
  assert.equal(score.maxPoints, 100);
  assert.equal(score.value, 50);
  assert.equal(score.factors.length, 2);
  assert.equal(
    evaluateProfile({ curves: [linear, rain] }, { ...inputs, windSpeed: 0, rain: 0 }).value,
    100,
  );
});

test("a negative direction curve can cancel every other positive contribution", () => {
  const profile: PointProfile = {
    curves: [
      makeCurve("windSpeed", [
        [0, 80],
        [100, 80],
      ]),
      makeCurve("windDirection", [
        [0, 20],
        [90, 20],
        [270, -200],
        [360, 20],
      ]),
    ],
  };
  const bad = evaluateProfile(profile, { ...inputs, windDirection: 270 });
  assert.equal(bad.maxPoints, 100);
  assert.equal(bad.points, -120);
  assert.equal(bad.value, 0);
  assert.equal(evaluateProfile(profile, { ...inputs, windDirection: 90 }).value, 100);
});

test("entirely negative curves contribute their actual maxima; a non-positive total maximum is unavailable", () => {
  const score = evaluateProfile(
    {
      curves: [
        makeCurve("windSpeed", [
          [0, 50],
          [100, 50],
        ]),
        makeCurve("rain", [
          [0, -10],
          [50, -20],
        ]),
      ],
    },
    { ...inputs, rain: 0 },
  );
  assert.equal(score.maxPoints, 40);
  assert.equal(score.value, 100);
  assert.equal(
    evaluateProfile(
      {
        curves: [
          makeCurve("rain", [
            [0, -10],
            [50, -20],
          ]),
        ],
      },
      inputs,
    ).value,
    null,
  );
  assert.throws(() => parseProfile({ curves: [] }), /positive sum/);
});

test("direction curves wrap at north and validation rejects a seam", () => {
  const curve = makeCurve("windDirection", [
    [0, 20],
    [90, 50],
    [180, -100],
    [360, 20],
  ]);
  assert.equal(evaluateCurve(curve, 0), evaluateCurve(curve, 360));
  assert.equal(evaluateCurve(curve, -1), evaluateCurve(curve, 359));
  assert.ok(Math.abs(evaluateCurve(curve, 359.9999) - evaluateCurve(curve, 0)) < 0.001);
  assert.throws(
    () =>
      parseCurve({
        ...curve,
        points: [
          { x: 0, y: 20 },
          { x: 360, y: 21 },
        ],
      }),
    /join/,
  );
});

test("missing enabled inputs are unavailable, while disabled variables do not matter", () => {
  const profile = { curves: [linear] };
  assert.equal(evaluateProfile(profile, { ...inputs, windSpeed: null }).value, null);
  assert.notEqual(evaluateProfile(profile, { ...inputs, rain: null }).value, null);
  const duplicate = { curves: [linear, linear] };
  assert.throws(() => parseProfile(duplicate), /only one curve/);
  assert.throws(
    () =>
      parseCurve({
        ...linear,
        points: [
          { x: 1, y: 10 },
          { x: 1, y: 0 },
        ],
      }),
    /unique/,
  );
  assert.throws(
    () =>
      parseCurve({
        ...linear,
        points: [
          { x: 0, y: NaN },
          { x: 100, y: 0 },
        ],
      }),
    /number/,
  );
});

test("all three activities and both coasts can reach 100 at their own curve maxima", () => {
  for (const spot of [piha, teArai]) {
    for (const profile of Object.values(spot.scoring)) {
      const best = { ...inputs };
      for (const curve of profile.curves.filter((item) => item.enabled))
        best[curve.variable] = curve.points.find((point) => point.y === curveMaximum(curve))!.x;
      assert.equal(evaluateProfile(profile, best).value, 100);
      assert.doesNotThrow(() => parseProfile(profile));
    }
  }
  assert.notDeepEqual(piha.scoring.surfing, teArai.scoring.surfing);
});

test("live forecasts and simulations use identical input mappings and normalization", () => {
  const hour = normalizeHour(
    "2026-11-10T10:00",
    {
      time: "2026-11-09T21:00:00Z",
      wind_speed_10m: 5,
      wind_gusts_10m: 8,
      wind_direction_10m: 90,
      precipitation: 0,
      weather_code: 0,
      is_day: 1,
    },
    { wave_height: 1.2, swell_wave_height: 1.1, swell_wave_period: 12, swell_wave_direction: 240 },
    piha,
  );
  assert.deepEqual(scoreHour(hour, piha), simulate(piha, scenarioFromHour(hour)));
  assert.equal(
    hour.scores.fishing.value,
    Math.min(hour.scores.rockFishing.value!, hour.scores.inshoreFishing.value!),
  );
  const night = { ...hour, isDay: false };
  assert.equal(summarize([night]).scores.surfing.average, null);
  assert.equal(summarize([hour, night]).scores.surfing.scoredHours, 1);
  const custom: Spot = structuredClone(piha);
  custom.scoring.surfing = { curves: [linear] };
  assert.equal(
    scoreHour({ ...hour, weatherCode: 95 }, custom).surfing.value,
    scoreHour(hour, custom).surfing.value,
  );
});
