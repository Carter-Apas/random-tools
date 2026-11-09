import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: { entry: "src/library.ts", formats: ["es"], fileName: "mono", cssFileName: "mono" },
    rollupOptions: { external: ["react", "react-dom", "react/jsx-runtime"] },
  },
});
