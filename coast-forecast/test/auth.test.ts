import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { piha, teArai, stubFetch, now } from "./fixtures.js";
import { serve } from "./http-helper.js";

import { createAdminAuth } from "../server/auth.js";
import { createForecastService } from "../server/forecast.js";
import { memorySettings } from "../server/settings.js";

const options = () => ({
  spots: [piha, teArai],
  settings: memorySettings([piha, teArai]),
  getForecast: createForecastService({ fetcher: stubFetch, now }),
  now,
});

const postPassword = (password: string) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password }),
});

test("setup persists a salted hash, protects admin reads and writes, and keeps credentials out of exports", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "coast-auth-"));
  const path = join(directory, "admin-password.json");
  context.after(() => rm(directory, { recursive: true, force: true }));
  const request = await serve(context, { ...options(), auth: await createAdminAuth({ path }) });
  assert.deepEqual(await (await request("/api/admin/session")).json(), {
    authenticated: false,
    configured: false,
  });
  assert.equal((await request("/api/admin/settings")).status, 401);
  assert.equal((await request("/api/admin/config", { method: "PUT", body: "{}" })).status, 401);
  assert.equal((await request("/api/v1/forecast?spot=piha")).status, 200);
  const setup = await request("/api/admin/setup", postPassword("test-password"));
  assert.equal(setup.status, 200);
  assert.match(setup.headers.get("set-cookie")!, /HttpOnly/);
  assert.match(setup.headers.get("set-cookie")!, /SameSite=Strict/);
  const cookie = setup.headers.get("set-cookie")!.split(";")[0];
  const stored = await readFile(path, "utf8");
  assert.ok(!stored.includes("test-password"));
  assert.equal(JSON.parse(stored).hash.length, 128);
  assert.equal((await request("/api/admin/settings")).status, 200);
  assert.equal((await request("/api/admin/setup", postPassword("other-password"))).status, 409);
  const exported = await (await request("/api/admin/config")).text();
  assert.ok(
    !exported.includes("test-password") &&
      !exported.includes('"hash"') &&
      !exported.includes('"salt"'),
  );
  await request("/api/admin/logout", { method: "POST" });
  assert.equal((await request("/api/admin/config")).status, 401);
  assert.equal((await request("/api/admin/login", postPassword("incorrect"))).status, 401);
  assert.equal((await request("/api/admin/login", postPassword("test-password"))).status, 200);
  const restarted = await serve(context, { ...options(), auth: await createAdminAuth({ path }) });
  assert.equal(
    (await restarted("/api/admin/settings", { headers: { Cookie: cookie } })).status,
    401,
  );
  assert.equal((await restarted("/api/admin/login", postPassword("test-password"))).status, 200);
  assert.equal((await restarted("/api/admin/config")).status, 200);
});

test("environment password disables setup and session expiry or logout revokes access", async (context) => {
  let clock = 0;
  const request = await serve(context, {
    ...options(),
    auth: await createAdminAuth({ password: "environment-secret", now: () => clock }),
  });
  assert.equal((await request("/api/admin/setup", postPassword("other-password"))).status, 409);
  const login = await request("/api/admin/login", {
    ...postPassword("environment-secret"),
    headers: { "X-Forwarded-Proto": "https" },
  });
  assert.equal(login.status, 200);
  assert.match(login.headers.get("set-cookie")!, /; Secure/);
  assert.equal((await request("/api/admin/settings")).status, 200);
  clock = 12 * 60 * 60 * 1000 + 1;
  assert.equal((await request("/api/admin/settings")).status, 401);
  assert.equal((await request("/api/admin/login", postPassword("environment-secret"))).status, 200);
  await request("/api/admin/logout", { method: "POST" });
  assert.equal((await request("/api/v1/admin/settings")).status, 401);
});

test("cross-origin mutation is refused and invalid setup bodies do not create a password", async (context) => {
  const request = await serve(context, { ...options(), auth: await createAdminAuth() });
  assert.equal(
    (
      await request("/api/admin/setup", {
        ...postPassword("test-password"),
        headers: { Origin: "https://elsewhere.example" },
      })
    ).status,
    403,
  );
  assert.equal((await request("/api/admin/setup", postPassword("short"))).status, 400);
  assert.equal((await request("/api/admin/setup", { method: "POST", body: "null" })).status, 400);
  assert.equal((await request("/api/admin/setup", { method: "POST", body: "{" })).status, 400);
  assert.deepEqual(await (await request("/api/admin/session")).json(), {
    authenticated: false,
    configured: false,
  });
});
