import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    setupFiles: ["./test/preload.ts"],
    testTimeout: 30000, // 30 seconds for LSP tests
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tui": path.resolve(__dirname, "./src/cli/cmd/tui"),
      "@tscoder/util": path.resolve(__dirname, "../util/src"),
      "@tscoder/sdk": path.resolve(__dirname, "../sdk/js/src"),
      "@tscoder/plugin": path.resolve(__dirname, "../plugin/src"),
    },
  },
})
