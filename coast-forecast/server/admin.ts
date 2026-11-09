import type { IncomingMessage } from "node:http";

import { InvalidSettings } from "./settings.js";
import type { SettingsStore } from "./settings.js";
import { InvalidRequest, readJson } from "./http-json.js";

export const adminResponse = async (
  request: IncomingMessage,
  path: string,
  store: SettingsStore,
): Promise<{ status: number; body: unknown; allow?: string }> => {
  if (path === "/api/admin/config") return configurationResponse(request, store);
  if (path === "/api/admin/settings") {
    if (!["GET", "HEAD"].includes(request.method ?? ""))
      return {
        status: 405,
        allow: "GET, HEAD",
        body: { error: { code: "method_not_allowed", message: "Use GET." } },
      };
    return { status: 200, body: store.read() };
  }
  const match = /^\/api\/admin\/spots\/(piha|te-arai)$/.exec(path);
  if (!match)
    return {
      status: 404,
      body: { error: { code: "not_found", message: "Unknown admin endpoint." } },
    };
  if (!["PUT", "DELETE"].includes(request.method ?? ""))
    return {
      status: 405,
      allow: "PUT, DELETE",
      body: {
        error: { code: "method_not_allowed", message: "Use PUT to update, DELETE to reset." },
      },
    };
  return changeSpot(request, store, match[1]);
};

const changeSpot = async (request: IncomingMessage, store: SettingsStore, id: string) => {
  try {
    const spot =
      request.method === "DELETE"
        ? await store.reset(id)
        : await store.update(id, await readJson(request));
    return { status: 200, body: { spot, persistence: store.read().persistence } };
  } catch (error) {
    if (!(
      error instanceof InvalidSettings ||
      error instanceof InvalidRequest ||
      error instanceof SyntaxError
    ))
      throw error;
    return { status: 400, body: { error: { code: "invalid_settings", message: error.message } } };
  }
};

const configurationResponse = async (request: IncomingMessage, store: SettingsStore) => {
  if (["GET", "HEAD"].includes(request.method ?? "")) return { status: 200, body: store.export() };
  if (request.method !== "PUT")
    return {
      status: 405,
      allow: "GET, HEAD, PUT",
      body: {
        error: {
          code: "method_not_allowed",
          message: "Use GET to export or PUT to import configuration.",
        },
      },
    };
  try {
    return { status: 200, body: await store.replace(await readJson(request)) };
  } catch (error) {
    if (!(
      error instanceof InvalidSettings ||
      error instanceof InvalidRequest ||
      error instanceof SyntaxError
    ))
      throw error;
    return { status: 400, body: { error: { code: "invalid_settings", message: error.message } } };
  }
};
