import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const dirname = path.dirname(fileURLToPath(import.meta.url));

// El proveedor de visión de test es el fake (forzado en playwright.config.ts con
// OLLAMA_BASE_URL vacío): siempre devuelve el mismo Charizard/Base/4/102/Rare Holo
// determinista, sin red ni depender de que Ollama esté corriendo en la máquina de CI.
const TEST_PHOTO = path.resolve(dirname, "fixtures/test-card.png");

test("flujo completo: hacer foto, revisar lo reconocido, añadir a la colección y ver el valor en el resumen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Añadir", exact: true }).click();

  await page.locator('input[type="file"]').setInputFiles(TEST_PHOTO);
  await expect(page.getByText("Charizard")).toBeVisible();
  await expect(page.getByText("Base")).toBeVisible();

  await page.getByRole("button", { name: "+ A mi colección" }).click();
  await page.getByLabel("Precio de compra (€)").fill("300");
  await page.getByRole("button", { name: "Añadir a mi colección" }).click();
  await expect(page.getByText("Charizard añadida a tu colección.")).toBeVisible();

  await page.getByRole("button", { name: "Mi colección" }).click();
  await expect(page.getByText("Charizard")).toBeVisible();
  await expect(page.getByText("300,00 €")).toBeVisible();

  // Sin catálogo externo no hay precio de mercado automático: hay que estimarlo a mano.
  await page.getByRole("button", { name: "Sin valor conocido" }).click();
  await page.getByRole("spinbutton").fill("350");
  await page.getByRole("button", { name: "OK" }).click();

  await page.getByRole("button", { name: "Resumen" }).click();
  await expect(page.getByText("350,00 €")).toBeVisible(); // valor estimado a mano
  await expect(page.getByText("300,00 €")).toBeVisible(); // invertido
});

test("añade un deseo a la wishlist con mes objetivo y lo agrupa correctamente", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Añadir", exact: true }).click();

  await page.locator('input[type="file"]').setInputFiles(TEST_PHOTO);
  await expect(page.getByText("Charizard")).toBeVisible();

  await page.getByRole("button", { name: "+ A la wishlist" }).click();
  await page.getByRole("button", { name: "Añadir a la wishlist" }).click();
  await expect(page.getByText("añadida a la wishlist")).toBeVisible();

  await page.getByRole("button", { name: "Wishlist", exact: true }).click();
  await expect(page.getByText("Charizard")).toBeVisible();

  await page.locator('input[type="month"]').fill("2026-08");
  await expect(page.getByText("Agosto de 2026")).toBeVisible();
});
