import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createStore } from "../store.mjs";
import { createApp } from "../server.mjs";

const fixture = async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "mermaid-test-"));
  t.after(() => rm(directory, { recursive: true }));
  return directory;
};

test("tabs survive reopening the same container filesystem; a fresh one starts over", async (t) => {
  const directory = await fixture(t);
  const store = await createStore(directory);
  const id = store.snapshot().tabs[0].id;
  await store.mutate("update", id, {
    expectedRevision: 0,
    name: "Architecture",
    source: "flowchart LR\n A-->B",
  });
  await store.mutate("create");
  assert.deepEqual((await createStore(directory)).snapshot(), store.snapshot());
  const fresh = await createStore(await fixture(t));
  assert.equal(fresh.snapshot().tabs.length, 1);
  assert.notEqual(fresh.snapshot().id, store.snapshot().id);
});
test("simultaneous creation cannot exceed ten tabs and deletion keeps one", async (t) => {
  const store = await createStore(await fixture(t));
  const created = await Promise.allSettled(
    Array.from({ length: 15 }, () => store.mutate("create")),
  );
  assert.equal(created.filter((result) => result.status === "fulfilled").length, 9);
  assert.equal(store.snapshot().tabs.length, 10);
  for (const tab of store.snapshot().tabs.slice(1))
    await store.mutate("delete", tab.id, { expectedRevision: tab.revision });
  const tab = store.snapshot().tabs[0];
  await assert.rejects(store.mutate("delete", tab.id, { expectedRevision: tab.revision }), {
    status: 409,
  });
  assert.equal(store.snapshot().tabs.length, 1);
});
test("concurrent source updates cannot silently overwrite each other", async (t) => {
  const store = await createStore(await fixture(t));
  const tab = store.snapshot().tabs[0];
  const edits = await Promise.allSettled(
    ["A-->B", "A-->C"].map((source) =>
      store.mutate("update", tab.id, { expectedRevision: 0, source }),
    ),
  );
  assert.equal(edits.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(edits.find((result) => result.status === "rejected").reason.status, 409);
  assert.equal(store.snapshot().tabs[0].source, "A-->B");
  assert.equal(store.snapshot().tabs[0].revision, 1);
});
test("invalid writes leave the saved workspace unchanged and do not block later edits", async (t) => {
  const directory = await fixture(t);
  const store = await createStore(directory);
  const before = store.snapshot();
  const id = before.tabs[0].id;
  for (const input of [
    { name: " ", expectedRevision: 0 },
    { source: "a".repeat(100_001), expectedRevision: 0 },
    { source: 5, expectedRevision: 0 },
    { source: "" },
    { expectedRevision: 0 },
  ]) {
    await assert.rejects(store.mutate("update", id, input), { status: 400 });
    assert.deepEqual(store.snapshot(), before);
  }
  await store.mutate("update", id, { source: "", expectedRevision: 0 });
  assert.equal(
    JSON.parse(await readFile(join(directory, "workspace.json"), "utf8")).tabs[0].source,
    "",
  );
});

test("a failed disk write rejects the edit without poisoning later saves", async (t) => {
  const directory = await fixture(t);
  const store = await createStore(directory);
  const before = store.snapshot();
  const id = before.tabs[0].id;
  const temporary = join(directory, "workspace.json.tmp");
  await mkdir(temporary);
  await assert.rejects(
    store.mutate("update", id, {
      expectedRevision: 0,
      source: "flowchart LR\n Failed-->Save",
    }),
    { code: "EISDIR" },
  );
  assert.deepEqual(store.snapshot(), before);
  await rm(temporary, { recursive: true });
  const saved = await store.mutate("update", id, {
    expectedRevision: 0,
    source: "flowchart LR\n Recovered-->Saved",
  });
  assert.equal(saved.tabs[0].source, "flowchart LR\n Recovered-->Saved");
  assert.equal(saved.tabs[0].revision, 1);
  assert.deepEqual(JSON.parse(await readFile(join(directory, "workspace.json"), "utf8")), saved);
});

test("HTTP changes are broadcast live and malformed/stale requests are rejected", async (t) => {
  const app = await createApp({ dataDir: await fixture(t) });
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  t.after(() => app.close());
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const initial = await (await fetch(`${base}/api/state`)).json();
  const abort = new AbortController();
  t.after(() => abort.abort());
  const events = await fetch(`${base}/api/events`, { signal: abort.signal });
  assert.equal(events.headers.get("x-accel-buffering"), "no");
  const reader = events.body.getReader();
  const first = new TextDecoder().decode((await reader.read()).value);
  assert.match(first, /First diagram/);

  const patch = (body, headers = {}) =>
    fetch(`${base}/api/tabs/${initial.tabs[0].id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });

  const result = await patch({
    source: "flowchart LR\n A-->B",
    expectedRevision: 0,
    actor: "test-client",
  });
  assert.equal(result.status, 200);
  const broadcast = new TextDecoder().decode((await reader.read()).value);
  assert.match(broadcast, /test-client/);
  assert.match(broadcast, /A-->B/);
  const stale = await patch({ source: "A-->C", expectedRevision: 0 });
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).state.tabs[0].revision, 1);
  assert.equal(
    (
      await patch(
        { name: "wrong site", expectedRevision: 1 },
        { Origin: "https://elsewhere.example" },
      )
    ).status,
    403,
  );
  assert.equal((await patch(null)).status, 400);
  assert.equal((await fetch(`${base}/healthz`)).status, 200);
  assert.equal((await fetch(`${base}/api/unknown`)).status, 404);
  abort.abort();
});
