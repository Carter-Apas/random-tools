import assert from "node:assert/strict";
import { test } from "node:test";

import { piha, date, now, stubFetch } from "./fixtures.js";

import { createForecastService } from "../server/forecast.js";
import { incomingFlow } from "../shared/direction-flow.js";
import { bearingBetween, wrapBearing } from "../shared/orientation.js";
import { windTimeline } from "../src/wind-timeline.js";

test("coastal flow arrows originate at the FROM bearing and travel toward the place, including the dateline", () => {
  for (const origin of [piha, { latitude: -36, longitude: 179.999 }]) {
    for (const direction of [0, 90, 180, 270, 359]) {
      const flow = incomingFlow(origin, direction, 1100);
      const sourceBearing = bearingBetween(origin, flow.source);
      const travelBearing = bearingBetween(flow.source, flow.tip);
      assert.ok(Math.abs(wrapBearing(sourceBearing - direction + 180) - 180) < 0.0001);
      assert.ok(Math.abs(wrapBearing(travelBearing - direction) - 180) < 0.05);
    }
  }
  const east = incomingFlow(piha, 90, 700);
  assert.ok(east.source.longitude > east.tip.longitude);
  assert.ok(east.tip.longitude > piha.longitude);
  assert.ok(east.wings.every((wing) => wing.longitude > east.tip.longitude));
});

test("wind timeline keeps the selected hour visible on small screens, preserves zero and never fabricates a missing direction", async () => {
  const forecast = await createForecastService({ fetcher: stubFetch, now })(piha, date);
  const hours = structuredClone(forecast.hours);
  hours[6].wind = { ...hours[6].wind, fromDeg: 0, speedKmh: 0, gustKmh: 0 };
  const calm = windTimeline(hours, 6, 250, 40, 20);
  assert.match(calm, /data-wind-hour="6"/);
  assert.match(calm, /rotate\(0\)/);
  assert.match(calm, /wind-hour-speed">0</);
  hours[6].wind.fromDeg = null;
  const missing = windTimeline(hours, 6, 250, 40, 20);
  assert.ok(!missing.includes("rotate(null)") && !missing.includes("NaN"));
  assert.match(missing, /Use the time slider/);
});
