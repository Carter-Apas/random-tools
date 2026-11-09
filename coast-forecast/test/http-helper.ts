import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { TestContext } from "node:test";

import { createHandler } from "../server/app.js";

export const serve = async (context: TestContext, options: Parameters<typeof createHandler>[0]) => {
  const server = createServer(createHandler(options));
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
  const base = `http://127.0.0.1:${address.port}`;
  let cookie = "";
  return async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    if (cookie) headers.set("Cookie", cookie);
    const response = await fetch(`${base}${path}`, { ...options, headers });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    return response;
  };
};
