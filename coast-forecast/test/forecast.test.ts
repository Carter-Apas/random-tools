import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { date, initial, now, piha, teArai, fixture, stubFetch } from "./fixtures.js";

import { createHandler } from "../server/app.js";
import { compass, windRelative } from "../server/conditions.js";
import { forecastDate, localTimestamp } from "../server/dates.js";
import { createForecastService, ForecastUnavailable } from "../server/forecast.js";
import { providerRows, providerUrl } from "../server/provider.js";
import { loadSpots, tuneSpot } from "../server/spots.js";
import type { Forecast, ForecastCollection } from "../shared/types.js";

test("tomorrow follows Auckland’s date, including a UTC date boundary and year rollover", () => {
  assert.equal(forecastDate("tomorrow", new Date("2026-11-09T12:00:00Z")), "2026-11-11");
  assert.equal(forecastDate("tomorrow", new Date("2026-12-31T00:00:00Z")), "2027-01-01");
  assert.equal(forecastDate("today", initial), "2026-11-09");
  for (const invalid of ["2026-02-30", "2026-11-08", "2026-11-16", "garbage", "2026-13-01"]) {
    assert.throws(() => forecastDate(invalid, initial));
  }
});

test("Unix instants preserve DST transitions and both repeated autumn hours", () => {
  assert.equal(localTimestamp(Date.parse("2026-09-26T13:00:00Z") / 1000), "2026-09-27T01:00");
  assert.equal(localTimestamp(Date.parse("2026-09-26T14:00:00Z") / 1000), "2026-09-27T03:00");
  const data = fixture(true);
  data.hourly.time = [
    Date.parse("2026-04-04T13:00:00Z") / 1000,
    Date.parse("2026-04-04T14:00:00Z") / 1000,
  ];
  const rows = [...providerRows(data).values()];
  assert.equal(rows.length, 2);
  assert.equal(rows[0].localTime, "2026-04-05T02:00");
  assert.equal(rows[1].localTime, "2026-04-05T02:00");
  assert.notEqual(rows[0].time, rows[1].time);
});

test("wind classification uses FROM bearings and differs between coasts", () => {
  assert.equal(windRelative(90, 15, piha.offshoreFromDegrees), "offshore");
  assert.equal(windRelative(270, 15, piha.offshoreFromDegrees), "onshore");
  assert.equal(windRelative(250, 15, teArai.offshoreFromDegrees), "offshore");
  assert.equal(windRelative(90, 15, teArai.offshoreFromDegrees), "onshore");
  assert.equal(windRelative(90, 0, 90), "calm");
  assert.equal(windRelative(null, 10, 90), null);
  assert.equal(compass(359), "N");
  assert.equal(compass(240), "WSW");
});

test("provider requests use separate land/sea coordinates and explicit units", () => {
  const marine = providerUrl("marine", piha, date);
  const weather = providerUrl("weather", piha, date);
  assert.equal(marine.searchParams.get("longitude"), "174.4");
  assert.equal(weather.searchParams.get("longitude"), "174.468");
  assert.equal(marine.searchParams.get("cell_selection"), "sea");
  assert.equal(weather.searchParams.get("wind_speed_unit"), "kmh");
  assert.equal(weather.searchParams.get("timeformat"), "unixtime");
  assert.equal(
    providerUrl("marine", piha, date, "test-key").hostname,
    "customer-marine-api.open-meteo.com",
  );
});

test("normalization preserves raw swell, unit values, midnight, zeros and daylight summary", async () => {
  const getForecast = createForecastService({ fetcher: stubFetch, now });
  const data = await getForecast(piha, date);
  assert.equal(data.hours.length, 24);
  assert.equal(data.hours[0].localTime, `${date}T00:00`);
  assert.equal(data.hours[0].time, "2026-11-09T11:00:00.000Z");
  assert.equal(data.hours[6].primarySwell.heightM, 1.4);
  assert.equal(data.hours[6].waterTemperatureC, 17.2);
  assert.equal(data.hours[6].precipitationMm, 0);
  assert.equal(data.hours[9].precipitationMm, 0.6);
  assert.equal(data.summary.precipitationTotalMm, 0.6);
  assert.equal(data.summary.lightestDaylightWind?.localTime, `${date}T08:00`);
  assert.equal(data.surfEstimate.calibrated, false);
  assert.equal(data.sunrise, `${date}T06:00`);
});

test("one-hour memory cache coalesces simultaneous calls; tuning reuses raw data", async () => {
  let calls = 0;
  let current = initial.getTime();

  const fetcher: typeof fetch = async (...args) => {
    calls++;
    return stubFetch(...args);
  };

  const getForecast = createForecastService({ fetcher, now: () => new Date(current) });
  const results = await Promise.all(Array.from({ length: 12 }, () => getForecast(piha, date)));
  assert.equal(calls, 2);
  assert.equal(new Set(results.map((item) => item.fetchedAt)).size, 1);
  current += 59 * 60 * 1000;
  const tuned = await getForecast(
    tuneSpot(piha, new URLSearchParams({ surf_factor: "0.75", offshore_from: "270" })),
    date,
  );
  assert.equal(calls, 2);
  assert.equal(tuned.hours[6].estimatedSurfHeightM, 1.2);
  assert.equal(tuned.hours[6].waves.heightM, 1.6);
  assert.equal(tuned.hours[6].primarySwell.heightM, 1.4);
  assert.equal(tuned.hours[6].wind.relative, "onshore");
  current += 60 * 1000;
  await getForecast(piha, date);
  assert.equal(calls, 4);
  await getForecast(teArai, date);
  assert.equal(calls, 6);
});

test("provider outages return marked stale data for at most six hours", async () => {
  let current = initial.getTime();
  let available = true;

  const fetcher: typeof fetch = async (...args) =>
    available ? stubFetch(...args) : new Response("unavailable", { status: 503 });

  const getForecast = createForecastService({ fetcher, now: () => new Date(current) });
  const first = await getForecast(piha, date);
  available = false;
  current += 61 * 60 * 1000;
  const fallback = await getForecast(piha, date);
  assert.equal(fallback.stale, true);
  assert.equal(fallback.fetchedAt, first.fetchedAt);
  assert.match(fallback.warnings.join(" "), /cached forecast/);
  current += 6 * 60 * 60 * 1000;
  await assert.rejects(getForecast(piha, date), ForecastUnavailable);
});

test("a missing marine provider produces nulls and a warning, without inventing surf", async () => {
  const fetcher: typeof fetch = async (input) =>
    String(input).includes("marine-api")
      ? new Response("error", { status: 503 })
      : Response.json(fixture(false));

  const data = await createForecastService({ fetcher, now })(piha, date);
  assert.equal(data.hours.length, 24);
  assert.equal(data.hours[6].primarySwell.heightM, null);
  assert.equal(data.hours[6].estimatedSurfHeightM, null);
  assert.equal(data.summary.swellHeightM, null);
  assert.equal(data.hours[6].wind.speedKmh, 15);
  assert.match(data.warnings.join(" "), /Marine forecast unavailable/);
});

test("missing rain prevents an incomplete total being reported as a dry day", async () => {
  const fetcher: typeof fetch = async (input) => {
    const data = fixture(String(input).includes("marine-api"));
    if (data.hourly.precipitation) data.hourly.precipitation[4] = null;
    return Response.json(data);
  };

  const data = await createForecastService({ fetcher, now })(piha, date);
  assert.equal(data.summary.precipitationTotalMm, null);
});

test("server defaults can be calibrated via a mounted JSON file; invalid overrides fail", async () => {
  const directory = await mkdtemp(join(tmpdir(), "coast-config-"));
  const path = join(directory, "spots.json");
  try {
    await writeFile(path, JSON.stringify({ piha: { surfHeightFactor: 0.8, calibrated: true } }));
    const configured = await loadSpots(path);
    assert.equal(configured[0].surfHeightFactor, 0.8);
    assert.equal(configured[0].calibrated, true);
    await writeFile(path, JSON.stringify({ piha: { surfHeightFactor: 0 } }));
    await assert.rejects(loadSpots(path), /between/);
    await writeFile(path, JSON.stringify({ unknown: {} }));
    await assert.rejects(loadSpots(path), /Unknown spot/);
    await writeFile(path, JSON.stringify({ piha: { name: "anything" } }));
    await assert.rejects(loadSpots(path), /Unsupported/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("HTTP API exposes both coasts, single forecasts, strict validation, schema and method handling", async (context) => {
  const getForecast = createForecastService({ fetcher: stubFetch, now });
  const server = createServer(createHandler({ spots: [piha, teArai], getForecast, now }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  );
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const both = await fetch(`${base}/api/v1/forecast`);
  assert.equal(both.status, 200);
  const collection = (await both.json()) as ForecastCollection;
  assert.deepEqual(
    collection.forecasts.map((item) => item.spot.id),
    ["piha", "te-arai"],
  );
  const one = await fetch(`${base}/api/forecast?spot=te-arai&surf_factor=0.5`);
  const data = (await one.json()) as Forecast;
  assert.equal(data.spot.id, "te-arai");
  assert.equal(data.hours[6].estimatedSurfHeightM, 0.8);
  for (const params of [
    "spot=unknown",
    "spot=",
    "date=2026-02-30",
    "surf_factor=1",
    "spot=piha&surf_factor=NaN",
    "spot=piha&surf_factor=",
    "spot=piha&offshore_from=360",
    "unexpected=1",
    "spot=piha&spot=te-arai",
  ]) {
    const result = await fetch(`${base}/api/v1/forecast?${params}`);
    assert.equal(result.status, 400, params);
  }
  assert.equal((await fetch(`${base}/api/v1/spots`)).status, 200);
  assert.equal((await fetch(`${base}/api/openapi.json`)).status, 200);
  assert.equal((await fetch(`${base}/healthz`)).status, 200);
  assert.equal((await fetch(`${base}/api/forecast`, { method: "POST" })).status, 405);
  assert.equal((await fetch(`${base}/api/forecast?spot=piha`, { method: "HEAD" })).status, 200);
  assert.equal((await fetch(`${base}/api/missing`)).status, 404);
});

test("combined HTTP forecasts preserve one healthy coast when the other fails", async (context) => {
  const healthy = createForecastService({ fetcher: stubFetch, now });

  const getForecast = async (spot: typeof piha, requested: string) => {
    if (spot.id === "te-arai") throw new ForecastUnavailable("Marine source unavailable.");
    return healthy(spot, requested);
  };

  const server = createServer(createHandler({ spots: [piha, teArai], getForecast, now }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(
    () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  );
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const result = await fetch(`http://127.0.0.1:${address.port}/api/v1/forecast`);
  const data = (await result.json()) as ForecastCollection;
  assert.equal(result.status, 200);
  assert.equal(data.forecasts.length, 1);
  assert.equal(data.errors[0].spot, "te-arai");
});
