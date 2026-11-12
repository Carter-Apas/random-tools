import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist/client" },
  server: {
    port: 5187,
    proxy: { "/socket.io": { target: "http://localhost:5188", ws: true } },
  },
});
