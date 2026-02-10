import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist", "e2e"],
    setupFiles: ["./happydom.ts"],
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      { find: /^@tscoder\/ui$/, replacement: path.resolve(__dirname, "../ui/src/components") },
      { find: /^@tscoder\/ui\/context/, replacement: path.resolve(__dirname, "../ui/src/context") },
      { find: /^@tscoder\/ui\/i18n/, replacement: path.resolve(__dirname, "../ui/src/i18n") },
      { find: /^@tscoder\/ui\/(.*)/, replacement: path.resolve(__dirname, "../ui/src/components/$1") },
      { find: "@tscoder/util", replacement: path.resolve(__dirname, "../util/src") },
      { find: "@tscoder/sdk", replacement: path.resolve(__dirname, "../sdk/js/src") },
    ],
  },
})
