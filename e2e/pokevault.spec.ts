import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

// El proveedor de sets de test es el fake (forzado en playwright.config.ts con
// POKEMON_TCG_PROVIDER=fake): conoce un único set fijo "Test Set" (id "ts1") con dos
// cartas deterministas ("Fake Pikachu" con precio de referencia, "Fake Charizard" sin
// él), sin red ni depender del proveedor real (TCGdex) en CI.

test("flujo completo: buscar y sincronizar un set, marcar una carta como tuya y ver su valor en el resumen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mi colección", exact: true }).click();
  await page.getByRole("button", { name: "Sets (0)" }).click();

  await page.getByPlaceholder("Nombre en inglés, p. ej. Pitch Black").fill("Test Set");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText("Test Set", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Añadir este set" }).click();

  // Recién sincronizado y sin ninguna carta tuya, está incompleto: se abre solo.
  await expect(page.getByText("Fake Pikachu")).toBeVisible();

  await page.getByRole("button", { name: "Seleccionar varias" }).click();
  await page.getByRole("button", { name: "Marcar Fake Pikachu como mía" }).click();
  await page.getByRole("button", { name: "Marcar 1 como mías" }).click();

  await page.getByRole("button", { name: "Cartas (1)" }).click();
  await expect(page.getByText("Fake Pikachu")).toBeVisible();
  // El precio de referencia del set sincronizado (1,50 €) se usa como valor estimado inicial.
  await expect(page.getByText("1,50 €")).toBeVisible();

  await page.getByRole("button", { name: "Resumen", exact: true }).click();
  await expect(page.getByText("1,50 €", { exact: true })).toBeVisible();
});

test("da de alta una carta suelta a mano, sin depender de ningún set sincronizado", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mi colección", exact: true }).click();
  await page.getByRole("button", { name: /^Cartas/ }).click();
  await page.getByRole("button", { name: "Añadir carta suelta" }).click();

  await page.getByPlaceholder("Charizard").fill("Eevee");
  await page.getByPlaceholder("Base Set").fill("Jungla");
  await page.getByRole("button", { name: "Añadir a mi colección" }).click();

  await expect(page.getByText("Eevee")).toBeVisible();
});

test("añade un deseo a la wishlist con mes objetivo y lo agrupa correctamente", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Wishlist", exact: true }).click();
  await page.getByRole("button", { name: "Añadir deseo a la wishlist" }).click();

  await page.getByLabel("Nombre").fill("Charizard");
  await page.getByRole("button", { name: "Añadir a la wishlist" }).click();
  await expect(page.getByText("Charizard")).toBeVisible();

  await page.locator('input[type="month"]').fill("2026-08");
  await expect(page.getByText("Agosto de 2026")).toBeVisible();
});
