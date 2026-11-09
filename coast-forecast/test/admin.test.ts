import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { now, piha, teArai, stubFetch } from "./fixtures.js";
import { serve } from "./http-helper.js";

import { createForecastService } from "../server/forecast.js";
import { InvalidSettings, loadSettings, memorySettings } from "../server/settings.js";
import { createAdminAuth } from "../server/auth.js";
import { makeCurve } from "../shared/scoring-config.js";
import type { ConfigurationDocument, Forecast } from "../shared/types.js";

const simpleProfile = {
  curves: [
    makeCurve("waveHeight", [
      [0, 30],
      [15, 30],
    ]),
  ],
};

test("curve configurations merge activities without overwriting another place; invalid graphs do not apply", async () => {
  const store = memorySettings([piha, teArai]);
  await store.update("piha", { scoring: { rockFishing: simpleProfile } });
  assert.deepEqual(store.read().spots[0].scoring.rockFishing, simpleProfile);
  assert.deepEqual(store.read().spots[1], teArai);
  for (const patch of [
    null,
    [],
    { surfHeightFactor: null },
    { scoring: { surfing: { curves: [] } } },
    { scoring: { unknown: {} } },
    {
      scoring: {
        surfing: {
          curves: [
            makeCurve("windSpeed", [
              [1, 20],
              [0, 10],
            ]),
          ],
        },
      },
    },
    { name: "" },
  ]) {
    const previous = store.read();
    await assert.rejects(store.update("piha", patch), InvalidSettings);
    assert.deepEqual(store.read(), previous);
  }
  await Promise.all([
    store.update("piha", { surfHeightFactor: 0.8 }),
    store.update("piha", { offshoreFromDegrees: 100 }),
  ]);
  assert.equal(store.read().spots[0].surfHeightFactor, 0.8);
  assert.equal(store.read().spots[0].offshoreFromDegrees, 100);
});

test("export/import and restarts preserve every point, interpolation choice, negative penalty and calibration", async () => {
  const directory = await mkdtemp(join(tmpdir(), "coast-curves-"));
  const path = join(directory, "settings.json");
  try {
    const first = await loadSettings([piha, teArai], path);
    const curve = {
      ...makeCurve("windSpeed", [
        [0, 50],
        [10, -100],
        [100, -250],
      ]),
      interpolation: "linear",
    };
    await first.update("piha", {
      surfHeightFactor: 0.75,
      scoring: { surfing: { curves: [curve] } },
    });
    const second = await loadSettings([piha, teArai], path);
    assert.deepEqual(second.export(), first.export());
    const imported = memorySettings([piha, teArai]);
    await imported.replace(JSON.parse(JSON.stringify(first.export())));
    assert.deepEqual(imported.export(), first.export());
    const before = imported.export();
    await assert.rejects(imported.replace({ schemaVersion: 99, spots: {} }));
    assert.deepEqual(imported.export(), before);
    await second.reset("piha");
    assert.deepEqual((await loadSettings([piha, teArai], path)).read().spots[0], piha);
    await assert.rejects(readFile(`${path}.tmp`), { code: "ENOENT" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("legacy threshold files are backed up and migrated once, retaining local calibration", async () => {
  const directory = await mkdtemp(join(tmpdir(), "coast-migrate-"));
  const path = join(directory, "settings.json");
  const legacy = {
    piha: {
      surfHeightFactor: 0.8,
      scoring: {
        surfing: {
          minHeightM: 0.3,
          idealMinHeightM: 1,
          idealMaxHeightM: 2,
          maxHeightM: 4,
          maxWindKmh: 30,
        },
      },
    },
  };
  try {
    await writeFile(path, JSON.stringify(legacy));
    const store = await loadSettings([piha, teArai], path);
    assert.equal(store.read().spots[0].surfHeightFactor, 0.8);
    assert.equal(store.export().schemaVersion, 3);
    assert.ok(
      store
        .read()
        .spots[0].scoring.surfing.curves.find((curve) => curve.variable === "surfHeight")!
        .points.some((point) => point.x === 2 && point.y > 0),
    );
    assert.deepEqual(JSON.parse(await readFile(`${path}.v1.bak`, "utf8")), legacy);
    await loadSettings([piha, teArai], path);
    assert.deepEqual(JSON.parse(await readFile(`${path}.v1.bak`, "utf8")), legacy);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("failed disk writes do not apply an unsaved configuration", async () => {
  const directory = await mkdtemp(join(tmpdir(), "coast-failure-"));
  try {
    const blocked = join(directory, "file");
    await writeFile(blocked, "not a directory");
    const store = memorySettings([piha, teArai], [piha, teArai], join(blocked, "settings.json"));
    await assert.rejects(store.update("piha", { surfHeightFactor: 0.5 }));
    assert.equal(store.read().spots[0].surfHeightFactor, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("authenticated curve changes update forecast scores without refetching hourly provider data", async (context) => {
  let calls = 0;

  const fetcher: typeof fetch = async (...args) => {
    calls++;
    return stubFetch(...args);
  };

  const settings = memorySettings([piha, teArai]);
  const request = await serve(context, {
    spots: [piha, teArai],
    settings,
    getForecast: createForecastService({ fetcher, now }),
    now,
    auth: await createAdminAuth({ password: "test-password" }),
  });
  assert.equal((await request("/api/admin/config")).status, 401);
  assert.equal(
    (
      await request("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password: "test-password" }),
      })
    ).status,
    200,
  );
  const first = (await (await request("/api/v1/forecast?spot=piha")).json()) as Forecast;
  assert.equal(calls, 2);
  const update = await request("/api/admin/spots/piha", {
    method: "PUT",
    body: JSON.stringify({
      surfHeightFactor: 0.25,
      scoring: { rockFishing: simpleProfile, inshoreFishing: simpleProfile },
    }),
  });
  assert.equal(update.status, 200);
  const second = (await (await request("/api/v1/forecast?spot=piha")).json()) as Forecast;
  assert.equal(second.hours[6].estimatedSurfHeightM, 0.4);
  assert.equal(second.hours[6].waves.heightM, first.hours[6].waves.heightM);
  assert.equal(second.hours[6].scores.fishing.value, 100);
  assert.equal(calls, 2);
  const exported = (await (await request("/api/admin/config")).json()) as ConfigurationDocument;
  assert.equal(exported.schemaVersion, 3);
  assert.equal(
    (await request("/api/admin/config", { method: "PUT", body: JSON.stringify(exported) })).status,
    200,
  );
  for (const body of ["{", "null", '{"schemaVersion":2,"spots":{}}'])
    assert.equal((await request("/api/admin/config", { method: "PUT", body })).status, 400);
  assert.equal((await request("/api/admin/spots/piha", { method: "DELETE" })).status, 200);
  const reset = (await (await request("/api/v1/forecast?spot=piha")).json()) as Forecast;
  assert.deepEqual(reset.hours[6].scores, first.hours[6].scores);
  assert.equal(calls, 2);
});
