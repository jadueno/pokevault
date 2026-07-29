import { test as setup } from "@playwright/test";
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from "./testUser.js";

const STORAGE_STATE_PATH = "e2e/.auth/user.json";

/** Login obligatorio en toda la app ahora (ver auth.ts): en vez de repetirlo en cada test,
 * se hace una vez aquí contra el backend real ya levantado, y se guarda el token en
 * localStorage vía `storageState` — todos los demás tests arrancan ya autenticados (ver
 * playwright.config.ts, proyecto "setup" del que dependen). */
setup("authenticate", async ({ page, request, baseURL }) => {
  const backendURL = process.env.E2E_BACKEND_URL ?? "http://localhost:3101";
  const res = await request.post(`${backendURL}/login`, { data: { email: E2E_USER_EMAIL, password: E2E_USER_PASSWORD } });
  const { token } = await res.json();

  // Hace falta haber cargado el origen del frontend al menos una vez para poder escribir
  // en su localStorage.
  await page.goto(baseURL!);
  await page.evaluate((t) => localStorage.setItem("pokevault_session_token", t), token);
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
