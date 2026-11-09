import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { now, piha, teArai, stubFetch } from "./fixtures.js";
import { serve } from "./http-helper.js";

import { createAdminAuth } from "../server/auth.js";
import { createForecastService } from "../server/forecast.js";
import { loadSettings, memorySettings } from "../server/settings.js";
import {
  bearingBetween,
  destination,
  directionReferences,
  shoreNormal,
} from "../shared/orientation.js";
import { configurationDocument, newPlace, placeId } from "../shared/places.js";
import type { Forecast, Spot } from "../shared/types.js";

const muriwai = () => ({
  ...newPlace("muriwai", "Muriwai", -36.82, 174.425),
  offshoreFromDegrees: 85,
});

test("added places, shoreline references and independent curves survive export, restart and reset", async () => {
  const directory = await mkdtemp(join(tmpdir(), "coast-places-"));
  const path = join(directory, "settings.json");
  try {
    const store = await loadSettings([piha, teArai], path);
    const added = muriwai();
    added.scoring.rockFishing.curves[0].points[0].y = -123;
    await store.replace(configurationDocument([piha, teArai, added]));
    const restarted = await loadSettings([piha, teArai], path);
    assert.deepEqual(restarted.read().spots, [piha, teArai, added]);
    assert.equal(
      restarted.read().defaults.find((spot) => spot.id === "muriwai")?.offshoreFromDegrees,
      85,
    );
    await restarted.reset("muriwai");
    const reset = restarted.read().spots.find((spot) => spot.id === "muriwai")!;
    assert.equal(reset.latitude, added.latitude);
    assert.equal(reset.offshoreFromDegrees, 85);
    assert.notEqual(reset.scoring.rockFishing.curves[0].points[0].y, -123);
    await restarted.replace(configurationDocument([reset]));
    assert.equal((await loadSettings([piha, teArai], path)).read().spots.length, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("invalid place geometry, identifiers, counts and text leave the saved configuration unchanged", async () => {
  const store = memorySettings([piha, teArai]);
  const valid = configurationDocument([muriwai()]);
  const invalid = [
    { schemaVersion: 3, spots: {} },
    { ...valid, spots: { "bad/id": valid.spots.muriwai } },
    { ...valid, spots: { muriwai: { ...valid.spots.muriwai, latitude: -91 } } },
    { ...valid, spots: { muriwai: { ...valid.spots.muriwai, marineLongitude: 181 } } },
    { ...valid, spots: { muriwai: { ...valid.spots.muriwai, name: " " } } },
    { ...valid, spots: { muriwai: { ...valid.spots.muriwai, arbitrary: true } } },
    configurationDocument(
      Array.from({ length: 33 }, (_, index) => ({ ...muriwai(), id: `place-${index}` })),
    ),
  ];
  for (const document of invalid) {
    await assert.rejects(store.replace(document));
    assert.deepEqual(store.read().spots, [piha, teArai]);
  }
});

test("version 2 curve documents migrate with exact scores and a preserved original backup", async () => {
  const directory = await mkdtemp(join(tmpdir(), "coast-v2-"));
  const path = join(directory, "settings.json");
  const spots = Object.fromEntries(
    [piha, teArai].map((spot) => [
      spot.id,
      {
        surfHeightFactor: spot.surfHeightFactor,
        offshoreFromDegrees: spot.offshoreFromDegrees,
        calibrated: spot.calibrated,
        scoring: spot.scoring,
      },
    ]),
  );
  const original = JSON.stringify({ schemaVersion: 2, spots });
  try {
    await writeFile(path, original);
    const store = await loadSettings([piha, teArai], path);
    assert.deepEqual(store.read().spots, [piha, teArai]);
    assert.equal(store.export().schemaVersion, 3);
    assert.equal(await readFile(`${path}.v2.bak`, "utf8"), original);
    const restarted = await loadSettings([piha, teArai], path);
    assert.deepEqual(restarted.export(), store.export());
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("authenticated custom places appear in public APIs and changed sampling coordinates use a fresh cache key", async (context) => {
  const urls: URL[] = [];

  const fetcher: typeof fetch = async (input, init) => {
    urls.push(new URL(String(input)));
    return stubFetch(input, init);
  };

  const store = memorySettings([piha, teArai]);
  const request = await serve(context, {
    spots: [piha, teArai],
    settings: store,
    getForecast: createForecastService({ fetcher, now }),
    now,
    auth: await createAdminAuth({ password: "places-password" }),
  });
  const document = configurationDocument([piha, teArai, muriwai()]);
  assert.equal(
    (await request("/api/admin/config", { method: "PUT", body: JSON.stringify(document) })).status,
    401,
  );
  await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password: "places-password" }),
  });
  assert.equal(
    (await request("/api/admin/config", { method: "PUT", body: JSON.stringify(document) })).status,
    200,
  );
  const metadata = (await (await request("/api/v1/spots")).json()) as { spots: Spot[] };
  assert.equal(metadata.spots[2].name, "Muriwai");
  const forecast = (await (await request("/api/v1/forecast?spot=muriwai")).json()) as Forecast;
  assert.equal(forecast.spot.offshoreFromDegrees, 85);
  assert.equal(urls.length, 2);
  assert.equal(urls[0].searchParams.get("latitude"), "-36.82");
  assert.equal(
    (
      await request("/api/admin/spots/muriwai", {
        method: "PUT",
        body: JSON.stringify({ offshoreFromDegrees: 105 }),
      })
    ).status,
    200,
  );
  await request("/api/v1/forecast?spot=muriwai");
  assert.equal(urls.length, 2);
  await request("/api/admin/spots/muriwai", {
    method: "PUT",
    body: JSON.stringify({ marineLongitude: 174.3 }),
  });
  await request("/api/v1/forecast?spot=muriwai");
  assert.equal(urls.length, 4);
  assert.equal(urls.at(-1)!.searchParams.get("longitude"), "174.3");
});

test("shoreline geometry gives FROM bearings for land, sea and both parallel directions, including north and dateline wrapping", () => {
  assert.deepEqual(
    directionReferences(90).map((ref) => ref.bearing),
    [90, 270, 180, 0],
  );
  assert.equal(shoreNormal(0, 90), 90);
  assert.equal(shoreNormal(180, 90), 90);
  assert.equal(shoreNormal(90, 359), 0);
  const origin = { latitude: -36.82, longitude: 174.425 };
  for (const bearing of [0, 45, 90, 180, 270, 359]) {
    const end = destination(origin, bearing, 2000);
    assert.ok(Math.abs(bearingBetween(origin, end) - bearing) < 0.000001);
  }
  assert.ok(destination({ latitude: 0, longitude: 179.999 }, 90, 2000).longitude < 0);
  assert.equal(placeId("Te Ārai", ["te-arai", "te-arai-2"]), "te-arai-3");
});
