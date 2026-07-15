import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

// El catálogo de test se siembra en global-setup.ts con el proveedor fake: incluye dos
// "Charizard" (uno del set "Base", otro de "Espada y Escudo") y un "Pikachu".

test("flujo completo: buscar, filtrar, añadir a la colección y ver el valor en el resumen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Buscar" }).click();

  await page.getByPlaceholder("Buscar por nombre, p. ej. Charizard").fill("charizard");
  await page.getByRole("main").getByRole("button", { name: "Buscar", exact: true }).click();

  // Dos resultados (uno por set) antes de filtrar.
  await expect(page.getByRole("button", { name: /Charizard/ })).toHaveCount(2);

  // Filtrar por expansión "Base" deja solo un resultado (único <select> de la pantalla).
  await page.locator("select").selectOption({ label: "Base" });
  await page.getByRole("main").getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByRole("button", { name: /Charizard/ })).toHaveCount(1);

  await page.getByRole("button", { name: /Charizard/ }).click();
  await expect(page.getByRole("heading", { name: "Charizard" })).toBeVisible();

  await page.getByRole("button", { name: "+ Añadir a mi colección" }).click();
  await page.getByLabel("Precio de compra (€)").fill("300");
  await page.getByRole("button", { name: "Añadir a mi colección" }).click();

  await page.getByRole("button", { name: "Mi colección" }).click();
  await expect(page.getByText("Charizard")).toBeVisible();
  await expect(page.getByText("300,00 €")).toBeVisible();

  await page.getByRole("button", { name: "Resumen" }).click();
  await expect(page.getByText("350,00 €")).toBeVisible(); // valor de mercado del fixture
  await expect(page.getByText("300,00 €")).toBeVisible(); // invertido
});

test("añade una carta a la wishlist con mes objetivo y la agrupa correctamente", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Buscar" }).click();

  await page.getByPlaceholder("Buscar por nombre, p. ej. Charizard").fill("pikachu");
  await page.getByRole("main").getByRole("button", { name: "Buscar", exact: true }).click();
  await page.getByRole("button", { name: /Pikachu/ }).click();
  await page.getByRole("button", { name: "+ Añadir a wishlist" }).click();
  await expect(page.getByText("añadida a la wishlist")).toBeVisible();

  await page.getByRole("button", { name: "Wishlist", exact: true }).click();
  await expect(page.getByText("Pikachu")).toBeVisible();

  await page.locator('input[type="month"]').fill("2026-08");
  await expect(page.getByText("Agosto de 2026")).toBeVisible();
});
