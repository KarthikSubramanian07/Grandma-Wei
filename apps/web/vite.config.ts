import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // `bun run api` serves the Pages Functions (and D1) on 8788.
    proxy: { "/api": "http://localhost:8788", "/s/": "http://localhost:8788" },
  },
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes("node_modules/react") ? "react" : undefined),
      },
    },
  },
});
