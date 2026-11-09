import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const files = {
  "/mono.css": ["mono.css", "text/css; charset=utf-8"],
  "/mono.js": ["mono.js", "text/javascript; charset=utf-8"],
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  "/model.js": ["model.js", "text/javascript; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  "/favicon.svg": ["favicon.svg", "image/svg+xml"],
};
const port = Number(process.env.PORT || 5173);
const server = createServer(async (request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" }).end("Method not allowed");
    return;
  }
  if (path === "/healthz") {
    response
      .writeHead(200, { "Content-Type": "text/plain" })
      .end(request.method === "HEAD" ? undefined : "ok\n");
    return;
  }
  const file = Object.hasOwn(files, path) ? files[path] : null;
  if (!file) {
    response.writeHead(404).end("Not found");
    return;
  }
  try {
    const content = await readFile(new URL(`./public/${file[0]}`, import.meta.url));
    response.writeHead(200, {
      "Content-Type": file[1],
      "Cache-Control": "no-cache",
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch (error) {
    console.error(error);
    response.writeHead(500).end("Unable to load the calculator");
  }
});
server.listen(port, "0.0.0.0", () =>
  console.log(`Reel capacity: http://localhost:${server.address().port}`),
);
