import { defineConfig } from "vite";

import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    {
      name: "admin-route",
      configureServer: (server) => {
        server.middlewares.use((request, _response, next) => {
          const url = new URL(request.url ?? "/", "http://localhost");
          if (["/admin", "/admin/"].includes(url.pathname))
            request.url = `/admin/index.html${url.search}`;
          next();
        });
      },
    },
  ],
  build: {
    outDir: "dist/client",
    rollupOptions: { input: { main: resolve("index.html"), admin: resolve("admin/index.html") } },
  },
  server: {
    host: "0.0.0.0",
    port: 5180,
    proxy: {
      "/api": { target: "http://127.0.0.1:5181", changeOrigin: false },
      "/healthz": { target: "http://127.0.0.1:5181", changeOrigin: false },
    },
  },
});
