import assert from "node:assert/strict";
import { test } from "node:test";

import { initial, now, piha, teArai } from "./fixtures.js";
import { serve } from "./http-helper.js";
import { weekFixture, weekFetch } from "./week-fixture.js";

import { addDays, localDate } from "../server/dates.js";
import { createForecastService, ForecastUnavailable } from "../server/forecast.js";
import { getOutlook } from "../server/outlook.js";
import type { Outlook } from "../shared/types.js";

const today = localDate(now());

test("seven-day outlook and simultaneous single-day requests share one weather and one marine request", async () => {
  const urls: URL[] = [];

  const fetcher: typeof fetch = async (input, init) => {
    urls.push(new URL(String(input)));
    return weekFetch(input, init);
  };

  const getForecast = createForecastService({ fetcher, now });
  const [outlook, tomorrow, last] = await Promise.all([
    getOutlook(piha, getForecast, now()),
    getForecast(piha, addDays(today, 1)),
    getForecast(piha, addDays(today, 6)),
  ]);
  assert.equal(urls.length, 2);
  assert.ok(
    urls.every(
      (url) =>
        url.searchParams.get("start_date") === today &&
        url.searchParams.get("end_date") === addDays(today, 6),
    ),
  );
  assert.deepEqual(
    outlook.days.map((day) => day.date),
    Array.from({ length: 7 }, (_, index) => addDays(today, index)),
  );
  assert.deepEqual(
    outlook.days.map((day) => day.summary?.waveHeightM?.max),
    [1, 2, 3, 4, 5, 6, 7],
  );
  assert.equal(outlook.days[1].periods[0].localTime, `${tomorrow.date}T06:00`);
  assert.equal(outlook.days[1].periods[0].scores.surfing, tomorrow.hours[6].scores.surfing.value);
  assert.equal(
    outlook.days[1].summary?.scores.rockFishing.average,
    tomorrow.summary.scores.rockFishing.average,
  );
  assert.equal(last.sunrise, `${addDays(today, 6)}T06:00`);
  assert.equal(last.sunset, `${addDays(today, 6)}T20:00`);
  await getOutlook({ ...piha, id: "same-coordinates", surfHeightFactor: 0.5 }, getForecast, now());
  assert.equal(urls.length, 2);
  await getOutlook(teArai, getForecast, now());
  assert.equal(urls.length, 4);
});

test("all seven days reuse raw data while curve and calibration edits recalculate scores", async () => {
  let calls = 0;

  const fetcher: typeof fetch = async (...args) => {
    calls++;
    return weekFetch(...args);
  };

  const getForecast = createForecastService({ fetcher, now });
  const first = await getOutlook(piha, getForecast, now());
  const tuned = structuredClone(piha);
  tuned.surfHeightFactor = 0.5;
  tuned.scoring.surfing.curves = [
    {
      variable: "windSpeed",
      enabled: true,
      interpolation: "linear",
      points: [
        { x: 0, y: 20 },
        { x: 100, y: 20 },
      ],
    },
  ];
  const second = await getOutlook(tuned, getForecast, now());
  assert.equal(calls, 2);
  assert.equal(second.days[2].summary?.estimatedSurfHeightM?.max, 1.5);
  assert.equal(first.days[2].summary?.estimatedSurfHeightM?.max, 3);
  assert.ok(
    second.days.every(
      (day) =>
        day.summary?.scores.surfing.average === 100 &&
        day.periods.every((period) => period.scores.surfing === 100),
    ),
  );
});

test("hourly refresh and stale fallback coalesce across dates and preserve correct day-specific sun times", async () => {
  let clock = initial.getTime();
  let available = true;
  let calls = 0;

  const fetcher: typeof fetch = async (...args) => {
    calls++;
    return available ? weekFetch(...args) : new Response("unavailable", { status: 503 });
  };

  const getForecast = createForecastService({ fetcher, now: () => new Date(clock) });
  const first = await getOutlook(piha, getForecast, new Date(clock));
  clock += 59 * 60000;
  await getOutlook(piha, getForecast, new Date(clock));
  assert.equal(calls, 2);
  clock += 2 * 60000;
  available = false;
  const stale = await getOutlook(piha, getForecast, new Date(clock));
  assert.equal(calls, 4);
  assert.ok(
    stale.days.every((day, index) => day.stale && day.fetchedAt === first.days[index].fetchedAt),
  );
  assert.equal((await getForecast(piha, addDays(today, 5))).sunrise, `${addDays(today, 5)}T06:00`);
  clock += 6 * 60 * 60000;
  const expired = await getOutlook(piha, getForecast, new Date(clock));
  assert.ok(expired.days.every((day) => day.summary === null && day.error));
});

test("missing late days and missing marine measurements stay unavailable without hiding other days", async () => {
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input));
    return Response.json(weekFixture(url.hostname.includes("marine-api"), today, 5));
  };

  const outlook = await getOutlook(piha, createForecastService({ fetcher, now }), now());
  assert.equal(outlook.days.length, 7);
  assert.equal(outlook.days[4].error, null);
  assert.equal(outlook.days[5].summary, null);
  assert.ok(outlook.days[6].error);

  const noMarine: typeof fetch = async (input, init) =>
    String(input).includes("marine-api")
      ? new Response("unavailable", { status: 503 })
      : weekFetch(input, init);

  const weatherOnly = await getOutlook(
    piha,
    createForecastService({ fetcher: noMarine, now }),
    now(),
  );
  assert.ok(
    weatherOnly.days.every(
      (day) => day.summary?.estimatedSurfHeightM === null && day.periods[0].wind?.speedKmh === 15,
    ),
  );
});

test("the outlook HTTP API validates parameters, supports HEAD and aliases, and marks total outages", async (context) => {
  const request = await serve(context, {
    spots: [piha, teArai],
    getForecast: createForecastService({ fetcher: weekFetch, now }),
    now,
  });
  const response = await request("/api/v1/outlook?spot=piha");
  assert.equal(response.status, 200);
  const outlook = (await response.json()) as Outlook;
  assert.equal(outlook.spot.id, "piha");
  assert.equal(outlook.days.length, 7);
  for (const params of [
    "",
    "spot=",
    "spot=unknown",
    "spot=piha&date=tomorrow",
    "spot=piha&spot=te-arai",
  ])
    assert.equal((await request(`/api/v1/outlook?${params}`)).status, 400);
  assert.equal((await request("/api/outlook?spot=te-arai")).status, 200);
  const head = await request("/api/v1/outlook?spot=piha", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  assert.equal((await request("/api/v1/outlook?spot=piha", { method: "POST" })).status, 405);
  const unavailable = await serve(context, {
    spots: [piha],
    getForecast: async () => {
      throw new ForecastUnavailable("Unavailable");
    },
    now,
  });
  const outage = await unavailable("/api/v1/outlook?spot=piha");
  assert.equal(outage.status, 503);
  assert.ok(
    ((await outage.json()) as Outlook).days.every((day) => day.summary === null && day.error),
  );
});

test("NZ midnight shifts the shared forecast window and DST days keep their 23 real hours", async () => {
  let clock = Date.parse("2026-11-09T10:55:00Z");
  const starts: string[] = [];

  const fetcher: typeof fetch = async (input, init) => {
    starts.push(new URL(String(input)).searchParams.get("start_date")!);
    return weekFetch(input, init);
  };

  const getForecast = createForecastService({ fetcher, now: () => new Date(clock) });
  await getForecast(piha, "2026-11-10");
  clock += 10 * 60000;
  const next = await getOutlook(piha, getForecast, new Date(clock));
  assert.equal(next.startDate, "2026-11-10");
  assert.deepEqual(starts, ["2026-11-09", "2026-11-09", "2026-11-10", "2026-11-10"]);

  const dstNow = () => new Date("2026-09-26T12:30:00Z");

  const dstFetch: typeof fetch = async (input) =>
    Response.json(
      weekFixture(
        String(input).includes("marine-api"),
        "2026-09-27",
        7,
        Date.parse("2026-09-26T12:00:00Z") / 1000,
        Date.parse("2026-10-03T11:00:00Z") / 1000,
      ),
    );

  const dst = createForecastService({ fetcher: dstFetch, now: dstNow });
  const day = await dst(piha, "2026-09-27");
  assert.equal(day.hours.length, 23);
  assert.equal(day.sunrise, "2026-09-27T06:00");
  assert.equal((await getOutlook(piha, dst, dstNow())).days.length, 7);
});
