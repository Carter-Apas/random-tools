import type { IncomingMessage } from "node:http";

import { adminResponse } from "./admin.js";
import type { AdminAuth } from "./auth.js";
import type { SettingsStore } from "./settings.js";

export const protectedAdminResponse = async (
  request: IncomingMessage,
  path: string,
  store: SettingsStore,
  auth: AdminAuth,
): Promise<{ status: number; body: unknown; allow?: string; cookie?: string }> => {
  const origin = request.headers.origin;
  if (
    !["GET", "HEAD"].includes(request.method ?? "") &&
    origin &&
    new URL(origin).host !== request.headers.host
  )
    return {
      status: 403,
      body: { error: { code: "origin_rejected", message: "Use the admin page on this server." } },
    };
  const session = await auth.route(request, path);
  if (session) return session;
  if (!auth.authorized(request))
    return {
      status: 401,
      body: {
        error: { code: "unauthorized", message: "Sign in to edit the forecast configuration." },
      },
    };
  return adminResponse(request, path, store);
};
