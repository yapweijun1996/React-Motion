import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "DEVELOPMENT_"],
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.tsx"),
      name: "ReactMotion",
      fileName: "react-motion",
      formats: ["iife"],
    },
    rollupOptions: {
      // Bundle everything — CFML host has no React
      external: [],
      output: {
        globals: {},
        assetFileNames: "react-motion.[ext]",
      },
    },
    cssCodeSplit: false,
  },
});
