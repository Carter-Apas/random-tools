import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: mode === "browser" ? [] : [react()],
  build: {
    emptyOutDir: mode !== "browser",
    lib: {
      entry: mode === "browser" ? "src/browser.ts" : "src/library.ts",
      formats: ["es"],
      fileName: () => (mode === "browser" ? "browser.js" : "mono.js"),
      cssFileName: "mono",
    },
    rollupOptions: { external: ["react", "react-dom", "react/jsx-runtime"] },
  },
}));
