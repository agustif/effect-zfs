import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["packages/effect-zfs/test/**/*.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    fileParallelism: false
  }
})
