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
      // OLLAMA_BASE_URL vacío fuerza el proveedor de visión fake (determinista, sin
      // red), aunque el .env local del desarrollador tenga Ollama configurado —
      // mismo criterio que "nous" para que el E2E no dependa de qué haya corriendo.
      env: { PORT: String(BACKEND_PORT), DATABASE_URL: process.env.TEST_DATABASE_URL ?? "", OLLAMA_BASE_URL: "" },
    },
    {
      command: `npx vite --port ${FRONTEND_PORT}`,
      port: FRONTEND_PORT,
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_URL: `http://localhost:${BACKEND_PORT}` },
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
