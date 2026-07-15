import { defineConfig } from "vitest/config";

// Config propia para que vitest no suba a buscar (y herede por error) el
// vite.config.ts del frontend cuando se corre desde backend/.
// fileParallelism en false: varios ficheros de test comparten una misma BD
// de test real (ver test/testPool.ts), y correrlos en paralelo provocaría carreras.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    fileParallelism: false,
  },
});
