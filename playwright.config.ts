import { defineConfig, devices } from "@playwright/test";

const BACKEND_PORT = 3101;
const FRONTEND_PORT = 5201;

// Suite E2E de camino feliz contra un backend + Postgres de test reales (nunca
// contra los datos reales — ver global-setup.ts). Complementa, no sustituye, a
// los tests unitarios/de componentes de src/ y a los de application/ del backend.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev",
      cwd: "backend",
      port: BACKEND_PORT,
      reuseExistingServer: !process.env.CI,
      // POKEMON_TCG_PROVIDER=fake fuerza el proveedor de sets fake (determinista, sin
      // red) — el real tiene ~45% de error y ~8s de latencia media, haría el E2E lento
      // y no determinista.
      env: {
        PORT: String(BACKEND_PORT),
        DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
        POKEMON_TCG_PROVIDER: "fake",
        // Login obligatorio (ver auth.ts): el servidor ya no lee LOGIN_USERNAME/
        // LOGIN_PASSWORD_HASH, solo necesita un secreto para firmar tokens.
        SESSION_SECRET: "e2e-test-secret",
      },
    },
    {
      command: `npx vite --port ${FRONTEND_PORT}`,
      port: FRONTEND_PORT,
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_URL: `http://localhost:${BACKEND_PORT}` },
    },
  ],
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
    },
  ],
});
