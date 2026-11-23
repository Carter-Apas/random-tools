import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { now, piha, teArai } from "./fixtures.js";
import { serve } from "./http-helper.js";
import { weekFetch } from "./week-fixture.js";

import { createAdminAuth } from "../server/auth.js";
import { mergeScoring } from "../server/validation.js";
import { createForecastService } from "../server/forecast.js";
import { loadSettings, memorySettings } from "../server/settings.js";
import { parseProfile, parseWindSurface } from "../shared/config-validation.js";
import { configurationDocument } from "../shared/places.js";
import { evaluateProfile } from "../shared/point-scoring.js";
import { makeCurve } from "../shared/scoring-config.js";
import { initialScenario } from "../shared/variables.js";
import { defaultWindSurface } from "../shared/wind-defaults.js";
import {
  compileWindSurface,
  maximumWind,
  profileMaximum,
  windFromCurves,
  windMaximum,
  setWindMode,
  usesWindSurface,
} from "../shared/wind-surface.js";
import type { Forecast, PointProfile, Outlook, WindSurface } from "../shared/types.js";

const inputs = initialScenario();

const surface = () => defaultWindSurface(90, "surfing");

const rain = () =>
  makeCurve("rain", [
    [0, 100],
    [50, 100],
  ]);

const profile = (): PointProfile => ({
  curves: [
    rain(),
    makeCurve("windSpeed", [
      [0, 1000],
      [100, 1000],
    ]),
    makeCurve("windDirection", [
      [0, 1000],
      [360, 1000],
    ]),
  ],
  windSurface: surface(),
});

test("wind direction changes the effect of the same strong wind, with one maximum and no standalone double counting", () => {
  const good = evaluateProfile(profile(), { ...inputs, windSpeed: 40, windDirection: 90 });
  const bad = evaluateProfile(profile(), { ...inputs, windSpeed: 40, windDirection: 270 });
  assert.equal(good.maxPoints, 125);
  assert.equal(good.points, 108);
  assert.equal(good.value, 86);
  assert.equal(bad.points, -100);
  assert.equal(bad.value, 0);
  assert.deepEqual(
    good.factors.map((factor) => factor.variable),
    ["rain", "wind"],
  );
  assert.deepEqual(good.factors[1].inputs, { windSpeed: 40, windDirection: 90 });
  assert.equal(evaluateProfile(profile(), { ...inputs, ...maximumWind(surface()) }).value, 100);
});

test("wind surface interpolation reaches every knot, wraps north smoothly, and never exceeds its true maximum", () => {
  const wind = surface();
  wind.slices[0].curve.points.splice(2, 0, { x: 12.345, y: 125 });
  const evaluate = compileWindSurface(wind);
  assert.equal(windMaximum(wind), 125);
  for (const slice of wind.slices)
    for (const point of slice.curve.points)
      assert.ok(Math.abs(evaluate(point.x, slice.direction) - point.y) < 1e-7);
  for (let speed = 0; speed <= 100; speed += 2)
    for (let direction = 0; direction < 360; direction += 3) {
      const points = evaluate(speed, direction);
      assert.ok(points <= 125 + 1e-7 && points >= -500 - 1e-7);
    }
  for (const speed of [0, 10, 22, 50, 100]) {
    assert.equal(evaluate(speed, 0), evaluate(speed, 360));
    assert.equal(evaluate(speed, -1), evaluate(speed, 359));
    assert.ok(Math.abs(evaluate(speed, -0.00001) - evaluate(speed, 0.00001)) < 0.001);
  }
  assert.equal(evaluate(-100, 90), evaluate(0, 90));
  assert.equal(evaluate(500, 90), evaluate(100, 90));
});

test("linear and stepped direction blending handle arbitrary bearings across the circular seam", () => {
  const wind: WindSurface = {
    enabled: true,
    interpolation: "linear",
    slices: [
      {
        direction: 30,
        curve: makeCurve("windSpeed", [
          [0, 40],
          [100, 40],
        ]),
      },
      {
        direction: 210,
        curve: makeCurve("windSpeed", [
          [0, -100],
          [100, -100],
        ]),
      },
    ],
  };
  const evaluate = compileWindSurface(wind);
  assert.equal(evaluate(50, 120), -30);
  assert.equal(evaluate(50, 300), -30);
  assert.ok(Math.abs(evaluate(50, 0) - evaluate(50, 360)) < 1e-9);
  assert.ok(Math.abs(compileWindSurface({ ...wind, interpolation: "step" })(10, 120) - 40) < 1e-9);
  assert.equal(compileWindSurface({ ...wind, interpolation: "step" })(10, 300), -100);
});

test("disabled surfaces exclude wind entirely and missing required speed or direction gives no fabricated score", () => {
  const active = profile();
  for (const missing of [{ windSpeed: null }, { windDirection: null }, { windSpeed: NaN }])
    assert.equal(evaluateProfile(active, { ...inputs, ...missing }).value, null);
  active.windSurface!.enabled = false;
  const disabled = evaluateProfile(active, { ...inputs, windSpeed: null, windDirection: null });
  assert.equal(disabled.value, 100);
  assert.equal(disabled.maxPoints, 100);
  assert.equal(disabled.factors.length, 1);
  const negative = surface();
  for (const slice of negative.slices) for (const point of slice.curve.points) point.y = -20;
  assert.equal(profileMaximum({ curves: [rain()], windSurface: negative }), 80);
  assert.equal(evaluateProfile({ curves: [rain()], windSurface: negative }, inputs).value, 100);
});

test("existing independent curves can seed slices while preserving their linear point shape and leaving the source untouched", () => {
  const independent: PointProfile = {
    curves: [
      {
        ...makeCurve("windSpeed", [
          [0, 20],
          [20, -30],
          [100, -100],
        ]),
        interpolation: "linear",
      },
      {
        ...makeCurve("windDirection", [
          [0, 0],
          [90, 30],
          [270, -100],
          [360, 0],
        ]),
        interpolation: "linear",
      },
    ],
  };
  const original = structuredClone(independent);
  const wind = windFromCurves(independent);
  const evaluate = compileWindSurface(wind);
  for (const speed of [0, 5, 20, 60, 100])
    for (const direction of [0, 1, 45, 90, 200, 270, 359]) {
      const old = evaluateProfile(independent, {
        ...inputs,
        windSpeed: speed,
        windDirection: direction,
      });
      assert.ok(Math.abs(evaluate(speed, direction) - old.points!) < 1e-7);
    }
  assert.deepEqual(independent, original);
  assert.equal(windMaximum(wind), 50);
  const flat = windFromCurves({
    curves: [
      makeCurve("windDirection", [
        [0, 10],
        [360, 10],
      ]),
    ],
  });
  assert.equal(flat.slices.length, 2);
  assert.doesNotThrow(() => parseWindSurface(flat));
});

test("surface validation rejects malformed direction rows and only accepts a positive combined profile maximum", () => {
  const valid = surface();
  const row = valid.slices[0];
  const invalid = [
    null,
    { ...valid, enabled: "yes" },
    { ...valid, interpolation: "cubic" },
    { ...valid, extra: true },
    { ...valid, slices: [row] },
    { ...valid, slices: [row, row] },
    { ...valid, slices: [...valid.slices].reverse() },
    { ...valid, slices: [{ ...row, direction: 360 }, ...valid.slices.slice(1)] },
    {
      ...valid,
      slices: [{ ...row, curve: { ...row.curve, variable: "rain" } }, ...valid.slices.slice(1)],
    },
    {
      ...valid,
      slices: [{ ...row, curve: { ...row.curve, enabled: false } }, ...valid.slices.slice(1)],
    },
  ];
  for (const input of invalid) assert.throws(() => parseWindSurface(input));
  assert.doesNotThrow(() => parseProfile({ curves: [], windSurface: valid }));
  const negative = structuredClone(valid);
  for (const slice of negative.slices) for (const point of slice.curve.points) point.y = -100;
  assert.throws(() => parseProfile({ curves: [], windSurface: negative }), /positive/);
  assert.throws(
    () => parseProfile({ curves: [], windSurface: { ...valid, enabled: false } }),
    /positive/,
  );
});

test("version 3 files retain independent scores on migration; applied surfaces survive save, export/import and restarts", async () => {
  const directory = await mkdtemp(join(tmpdir(), "coast-wind-"));
  const path = join(directory, "settings.json");
  const oldSpots = structuredClone([piha, teArai]);
  for (const spot of oldSpots)
    for (const activity of Object.values(spot.scoring)) delete activity.windSurface;
  const saved = { ...configurationDocument(oldSpots), schemaVersion: 3 };
  try {
    await writeFile(path, JSON.stringify(saved));
    const store = await loadSettings([piha, teArai], path);
    assert.deepEqual(store.read().spots, oldSpots);
    assert.deepEqual(
      evaluateProfile(store.read().spots[0].scoring.surfing, inputs),
      evaluateProfile(oldSpots[0].scoring.surfing, inputs),
    );
    assert.deepEqual(JSON.parse(await readFile(`${path}.v3.bak`, "utf8")), saved);
    assert.equal(store.export().schemaVersion, 4);
    const next = { ...oldSpots[0].scoring.surfing, windSurface: surface() };
    next.windSurface.slices[0].curve.points[0].y = -500;
    await store.update("piha", { scoring: { surfing: next } });
    await store.update("piha", {
      scoring: { surfing: setWindMode(store.read().spots[0].scoring.surfing, "independent") },
    });
    const restarted = await loadSettings([piha, teArai], path);
    assert.deepEqual(restarted.export(), store.export());
    const imported = memorySettings([piha, teArai]);
    await imported.replace(store.export());
    assert.deepEqual(imported.export(), store.export());
    const before = store.export();
    await assert.rejects(
      store.update("piha", {
        scoring: { surfing: { ...next, windSurface: { ...surface(), slices: [] } } },
      }),
    );
    assert.deepEqual(store.export(), before);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("live day forecasts and seven-day outlooks use the surface without another provider fetch after edits", async (context) => {
  let calls = 0;

  const fetcher: typeof fetch = async (...args) => {
    calls++;
    return weekFetch(...args);
  };

  const store = memorySettings([piha, teArai]);
  const request = await serve(context, {
    spots: [piha, teArai],
    settings: store,
    getForecast: createForecastService({ fetcher, now }),
    now,
    auth: await createAdminAuth({ password: "wind-test-password" }),
  });
  const before = (await (await request("/api/v1/forecast?spot=piha")).json()) as Forecast;
  const factor = before.hours[6].scores.surfing.factors.find((item) => item.variable === "wind")!;
  assert.equal(factor.inputs?.windDirection, 90);
  assert.equal(calls, 2);
  await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password: "wind-test-password" }),
  });
  const wind = surface();
  for (const slice of wind.slices)
    for (const point of slice.curve.points) point.y = point.x === 0 ? 25 : -1000;
  const patch = await request("/api/admin/spots/piha", {
    method: "PUT",
    body: JSON.stringify({ scoring: { surfing: { ...piha.scoring.surfing, windSurface: wind } } }),
  });
  assert.equal(patch.status, 200);
  const after = (await (await request("/api/v1/forecast?spot=piha")).json()) as Forecast;
  assert.equal(after.hours[6].scores.surfing.value, 0);
  assert.equal(
    after.hours[6].scores.surfing.factors.filter((item) => item.variable === "wind").length,
    1,
  );
  const overview = (await (await request("/api/v1/outlook?spot=piha")).json()) as Outlook;
  assert.equal(calls, 2);
  assert.ok(overview.days.every((day) => day.summary?.scores.surfing.average === 0));
});

test("wind scoring modes are mutually exclusive while preserving both sets of shapes", () => {
  const original = profile();
  const independent = setWindMode(original, "independent");
  assert.equal(usesWindSurface(independent), false);
  assert.deepEqual(independent.windSurface, original.windSurface);
  const separate = evaluateProfile(independent, { ...inputs, windSpeed: 40, windDirection: 270 });
  assert.deepEqual(
    separate.factors.map((factor) => factor.variable),
    ["rain", "windSpeed", "windDirection"],
  );
  assert.equal(separate.maxPoints, 2100);
  const joint = setWindMode(independent, "surface");
  assert.deepEqual(joint.curves, original.curves);
  assert.deepEqual(joint.windSurface, original.windSurface);
  assert.deepEqual(
    evaluateProfile(joint, inputs).factors.map((factor) => factor.variable),
    ["rain", "wind"],
  );
  assert.equal(evaluateProfile(joint, inputs).maxPoints, 125);
  assert.doesNotThrow(() => parseProfile(independent));
  assert.doesNotThrow(() => parseProfile(joint));
  assert.throws(
    () => parseProfile({ curves: [rain()], windMode: "both" }),
    /surface or independent/,
  );
  assert.throws(() => parseProfile({ curves: [rain()], windMode: "surface" }), /requires/);
});

test("legacy threshold edits switch explicitly selected surface profiles back to independent scoring", () => {
  const scoring = structuredClone(piha.scoring);
  scoring.surfing = setWindMode(scoring.surfing, "surface");
  const next = mergeScoring(scoring, { surfing: { maxWindKmh: 30 } });
  assert.equal(usesWindSurface(next.surfing), false);
  assert.equal(next.surfing.windSurface, undefined);
  assert.doesNotThrow(() => parseProfile(next.surfing));
});
