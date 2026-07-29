/** Credenciales fijas del usuario de test E2E — compartidas entre `global-setup.ts` (que
 * lo crea) y `auth.setup.ts` (que hace login real con ellas). No son reales, solo existen
 * en la base de datos de test. */
export const E2E_USER_EMAIL = "e2e@example.com";
export const E2E_USER_PASSWORD = "e2e-test-password";
