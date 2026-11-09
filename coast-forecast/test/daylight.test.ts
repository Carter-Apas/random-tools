import assert from "node:assert/strict";
import { test } from "node:test";

import { date, now, piha, teArai, fixture } from "./fixtures.js";

import { daylight } from "../server/daylight.js";
import { createForecastService } from "../server/forecast.js";

test("civil first and last light bracket sunrise and sunset for both coastal locations", () => {
  for (const spot of [piha, teArai]) {
    const light = daylight(date, spot);
    assert.ok(light.firstLight && light.lastLight);
    assert.ok(light.firstLight > `${date}T05:20` && light.firstLight < `${date}T06:00`);
    assert.ok(light.lastLight > `${date}T20:10` && light.lastLight < `${date}T21:00`);
    assert.ok(light.firstLight < `${date}T06:08`);
    assert.ok(light.lastLight > `${date}T20:03`);
  }
  assert.notDeepEqual(daylight(date, piha), daylight(date, teArai));
});

test("first and last light stay on the requested NZ date and follow daylight saving changes", () => {
  for (const [before, after, direction] of [
    ["2026-04-04", "2026-04-05", -1],
    ["2026-09-26", "2026-09-27", 1],
  ] as const) {
    const previous = daylight(before, piha);
    const current = daylight(after, piha);
    for (const field of ["firstLight", "lastLight"] as const) {
      assert.ok(previous[field] && current[field]);
      assert.equal(current[field].slice(0, 10), after);

      const minutes = (local: string) =>
        Number(local.slice(11, 13)) * 60 + Number(local.slice(14, 16));

      const change = (minutes(current[field]) - minutes(previous[field])) * direction;
      assert.ok(change > 50 && change < 70);
    }
  }
});

test("light times are included in forecast JSON even when the weather source is unavailable", async () => {
  const fetcher: typeof fetch = async (input) =>
    String(input).includes("marine-api")
      ? Response.json(fixture(true))
      : new Response("Unavailable", { status: 503 });

  const forecast = await createForecastService({ fetcher, now })(piha, date);
  assert.ok(forecast.firstLight?.startsWith(date));
  assert.ok(forecast.lastLight?.startsWith(date));
  assert.equal(forecast.sunrise, null);
  assert.equal(forecast.sunset, null);
});
