import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { gzipSync, gunzipSync } from "node:zlib";

import type { SourceSnapshot } from "../server/answers/catalogue-types.js";

export const contentRoot = new URL("./", import.meta.url);

export const readJson = async <T>(url: URL): Promise<T> =>
  JSON.parse(await readFile(url, "utf8")) as T;

export const atomicJson = async (url: URL, value: unknown, pretty = true): Promise<void> => {
  const temporary = new URL(url.href + ".tmp");
  await writeFile(temporary, JSON.stringify(value, null, pretty ? 2 : undefined) + "\n");
  await rename(temporary, url);
};

interface SnapshotLock {
  schemaVersion: 1;
  sources: { id: string; file: string; sha256: string }[];
}

const snapshotHash = (data: Uint8Array): string => createHash("sha256").update(data).digest("hex");

export const saveSnapshot = async (snapshot: SourceSnapshot): Promise<void> => {
  await mkdir(new URL("sources/", contentRoot), { recursive: true });
  const path = `sources/${snapshot.source.id}.json.gz`;
  const body = Buffer.from(JSON.stringify(snapshot));
  const lockUrl = new URL("sources.lock.json", contentRoot);
  const lock = await readJson<SnapshotLock>(lockUrl);
  const entry = { id: snapshot.source.id, file: path, sha256: snapshotHash(body) };
  lock.sources = [...lock.sources.filter((source) => source.id !== entry.id), entry].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  await writeFile(new URL(path, contentRoot), gzipSync(body, { level: 9 }));
  await atomicJson(lockUrl, lock);
};

export const loadSnapshots = async (directory: URL = contentRoot): Promise<SourceSnapshot[]> => {
  const lock = await readJson<SnapshotLock>(new URL("sources.lock.json", directory));
  if (
    lock.schemaVersion !== 1 ||
    new Set(lock.sources.map((entry) => entry.id)).size !== lock.sources.length
  )
    throw new Error("Invalid snapshot lock");
  const snapshots: SourceSnapshot[] = [];
  for (const entry of lock.sources) {
    if (!/^sources\/[a-z0-9-]+\.json\.gz$/.test(entry.file))
      throw new Error("Unsafe snapshot path");
    const bytes = gunzipSync(await readFile(new URL(entry.file, directory)));
    if (snapshotHash(bytes) !== entry.sha256)
      throw new Error(`Snapshot checksum mismatch: ${entry.id}`);
    const snapshot = JSON.parse(bytes.toString()) as SourceSnapshot;
    if (
      snapshot.schemaVersion !== 1 ||
      snapshot.source.id !== entry.id ||
      !Array.isArray(snapshot.records)
    )
      throw new Error(`Invalid source snapshot: ${entry.id}`);
    snapshots.push(snapshot);
  }
  return snapshots;
};
