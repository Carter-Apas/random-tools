import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { extname, resolve, sep } from "node:path";

import { createStore, WorkspaceError } from "./store.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".json": "application/json",
};

export const createApp = async ({ dataDir = resolve(root, ".data"), dev = false } = {}) => {
  const store = await createStore(dataDir);
  const clients = new Set();
  const vite = dev
    ? await (
        await import("vite")
      ).createServer({
        root,
        server: {
          middlewareMode: true,
          hmr: {
            port: Number(process.env.HMR_PORT || 24684),
            clientPort: Number(process.env.HMR_PORT || 24684),
          },
        },
        appType: "spa",
      })
    : null;

  const send = (response, status, body) =>
    response
      .writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      })
      .end(JSON.stringify(body));

  const event = (response, payload) => response.write(`data: ${JSON.stringify(payload)}\n\n`);

  const broadcast = (state, actor) => {
    for (const response of clients) event(response, { state, actor });
  };

  const server = createServer(async (request, response) => {
    try {
      const path = new URL(request.url, "http://localhost").pathname;
      if (path === "/healthz" && ["GET", "HEAD"].includes(request.method)) {
        response
          .writeHead(200, { "Content-Type": "text/plain" })
          .end(request.method === "HEAD" ? undefined : "ok\n");
        return;
      }
      if (path === "/api/state" && request.method === "GET")
        return send(response, 200, store.snapshot());
      if (path === "/api/events" && request.method === "GET") {
        response.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });
        event(response, { state: store.snapshot(), actor: null });
        clients.add(response);
        const heartbeat = setInterval(() => response.write(": heartbeat\n\n"), 15_000);
        response.on("close", () => {
          clearInterval(heartbeat);
          clients.delete(response);
        });
        return;
      }
      const match = path.match(/^\/api\/tabs(?:\/([a-f0-9-]{36}))?$/);
      if (match && ["POST", "PATCH", "DELETE"].includes(request.method)) {
        if ((request.method === "POST") === Boolean(match[1]))
          throw new WorkspaceError(405, "Method not allowed.");
        if (request.headers.origin && new URL(request.headers.origin).host !== request.headers.host)
          throw new WorkspaceError(403, "Use this site to edit the workspace.");
        if (request.headers["content-type"]?.split(";")[0].trim() !== "application/json")
          throw new WorkspaceError(415, "Send application/json.");
        let size = 0;
        const chunks = [];
        for await (const chunk of request) {
          size += chunk.length;
          if (size > 650_000) throw new WorkspaceError(413, "Request too large.");
          chunks.push(chunk);
        }
        let input;
        try {
          input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          throw new WorkspaceError(400, "Invalid JSON.");
        }
        if (!input || typeof input !== "object" || Array.isArray(input))
          throw new WorkspaceError(400, "Expected a JSON object.");
        const actor = typeof input.actor === "string" ? input.actor.slice(0, 64) : null;
        const action = { POST: "create", PATCH: "update", DELETE: "delete" }[request.method];
        const state = await store.mutate(action, match[1], input);
        broadcast(state, actor);
        return send(response, request.method === "POST" ? 201 : 200, state);
      }
      if (path.startsWith("/api/")) return send(response, 404, { error: "Not found." });
      if (!["GET", "HEAD"].includes(request.method))
        return send(response, 405, { error: "Method not allowed." });
      if (vite)
        return vite.middlewares(request, response, () =>
          send(response, 404, { error: "Not found." }),
        );
      const directory = resolve(root, "dist");
      const file = resolve(
        directory,
        `.${decodeURIComponent(path === "/" ? "/index.html" : path)}`,
      );
      if (!file.startsWith(directory + sep) || !types[extname(file)])
        return send(response, 404, { error: "Not found." });
      try {
        const content = await readFile(file);
        response.writeHead(200, {
          "Content-Type": types[extname(file)],
          "Cache-Control": path.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : "no-cache",
          "X-Content-Type-Options": "nosniff",
        });
        response.end(request.method === "HEAD" ? undefined : content);
      } catch (error) {
        if (["ENOENT", "EISDIR"].includes(error.code))
          return send(response, 404, { error: "Not found." });
        throw error;
      }
    } catch (error) {
      if (!(error instanceof WorkspaceError)) console.error(error);
      if (!response.headersSent)
        send(response, error.status || 500, {
          error: error.status ? error.message : "Unable to save the workspace. Try again.",
          ...(error.status === 409 ? { state: store.snapshot() } : {}),
        });
      else response.end();
    }
  });
  return {
    server,
    close: async () => {
      for (const response of clients) response.end();
      await vite?.close();
      await new Promise((resolveClose, reject) => {
        server.close((error) => (error ? reject(error) : resolveClose()));
        server.closeIdleConnections();
      });
    },
  };
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const app = await createApp({
    dataDir: process.env.DATA_DIR || resolve(root, ".data"),
    dev: process.argv.includes("--dev"),
  });
  app.server.listen(Number(process.env.PORT || 5173), "0.0.0.0", () =>
    console.log(`Mermaid: http://localhost:${app.server.address().port}`),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () => app.close().then(() => process.exit(0)));
}
