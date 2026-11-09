import { constants } from "node:fs";
import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { exportConfiguration, importConfiguration, patchSpot } from "./configuration.js";
import { asRecord } from "./validation.js";

import type { AdminSettings, ConfigurationDocument, Spot } from "../shared/types.js";

export interface SettingsStore {
  read: () => AdminSettings;
  update: (id: string, patch: unknown) => Promise<Spot>;
  reset: (id: string) => Promise<Spot>;
  export: () => ConfigurationDocument;
  replace: (input: unknown) => Promise<AdminSettings>;
}

export class InvalidSettings extends Error {}

export const memorySettings = (
  defaults: Spot[],
  initial = defaults,
  path?: string,
): SettingsStore => {
  let spots = structuredClone(initial);
  let queue = Promise.resolve();

  const read = (): AdminSettings => ({
    spots: structuredClone(spots),
    defaults: structuredClone(defaults),
    persistence: path ? "file" : "memory",
  });

  const commit = (transform: (current: Spot[]) => Spot[]): Promise<Spot[]> => {
    const operation = queue.then(async () => {
      let next: Spot[];
      try {
        next = transform(structuredClone(spots));
      } catch (error) {
        throw new InvalidSettings(
          error instanceof Error ? error.message : "Invalid configuration.",
        );
      }
      if (path) {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(`${path}.tmp`, `${JSON.stringify(exportConfiguration(next), null, 2)}\n`, {
          mode: 0o600,
        });
        await rename(`${path}.tmp`, path);
      }
      spots = next;
      return structuredClone(spots);
    });
    queue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  };

  const save = async (id: string, patch: unknown, reset = false): Promise<Spot> => {
    const next = await commit((current) => {
      const index = current.findIndex((spot) => spot.id === id);
      if (index < 0) throw new Error("Unknown spot. Use piha or te-arai.");
      current[index] = reset ? structuredClone(defaults[index]) : patchSpot(current[index], patch);
      return current;
    });
    return next.find((spot) => spot.id === id)!;
  };

  return {
    read,
    update: (id, patch) => save(id, patch),
    reset: (id) => save(id, {}, true),
    export: () => exportConfiguration(structuredClone(spots)),
    replace: async (input) => {
      await commit(() => importConfiguration(input, defaults));
      return read();
    },
  };
};

export const loadSettings = async (defaults: Spot[], path: string): Promise<SettingsStore> => {
  let saved: Record<string, unknown>;
  try {
    saved = asRecord(JSON.parse(await readFile(path, "utf8")), "Saved settings");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return memorySettings(defaults, defaults, path);
    throw error;
  }
  const spots = importConfiguration(saved, defaults);
  const store = memorySettings(defaults, spots, path);
  if (!Object.hasOwn(saved, "schemaVersion")) {
    try {
      await copyFile(path, `${path}.v1.bak`, constants.COPYFILE_EXCL);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    await store.replace(store.export());
  }
  return store;
};
