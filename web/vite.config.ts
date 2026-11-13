import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// "static" mode is the public snapshot: no server, data read from data.json, no Ask tab.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react()],
  build: {
    outDir: mode === "static" ? "dist-static" : "../server/dist",
    emptyOutDir: true,
  },
  server: { proxy: { "/api": "http://127.0.0.1:8765" } },
}))
