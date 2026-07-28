import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

// El proveedor de sets de test es el fake (forzado en playwright.config.ts con
// POKEMON_TCG_PROVIDER=fake): conoce un único set fijo "Test Set" (id "ts1") con dos
// cartas deterministas ("Fake Pikachu" con precio de referencia, "Fake Charizard" sin
// él), sin red ni depender del proveedor real (TCGdex) en CI.

test("flujo completo: buscar y sincronizar un set, marcar una carta como tuya y ver su valor en el resumen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mi colección", exact: true }).click();
  await page.getByRole("button", { name: "Sets", exact: true }).click();
  await page.getByRole("button", { name: "+ Set" }).click();

  await page.getByPlaceholder("Nombre en inglés, p. ej. Pitch Black").fill("Test Set");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText("Test Set", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Añadir este set" }).click();
  await page.getByRole("button", { name: "Cerrar" }).click();

  // Recién sincronizado y sin ninguna carta tuya, está incompleto: se abre solo.
  await expect(page.getByText("Fake Pikachu")).toBeVisible();

  await page.getByRole("button", { name: "Seleccionar varias" }).click();
  await page.getByRole("button", { name: "Marcar Fake Pikachu como mía" }).click();
  await page.getByRole("button", { name: "Marcar 1 como mías" }).click();

  await page.getByRole("button", { name: "Cartas", exact: true }).click();
  await expect(page.getByText("Fake Pikachu")).toBeVisible();
  // El precio de referencia del set sincronizado (1,50 €) se usa como valor estimado inicial.
  await expect(page.getByText("1,50 €")).toBeVisible();

  await page.getByRole("button", { name: "Resumen", exact: true }).click();
  // Ahora que "Estadísticas de la colección" también muestra el valor de la carta más
  // valiosa (Fake Pikachu, la única que tienes en este punto), "1,50 €" aparece dos veces
  // en la pantalla — se acota a la cifra grande de "Valor total estimado".
  await expect(page.getByText("Valor total estimado").locator("..").getByText("1,50 €", { exact: true })).toBeVisible();
});

test("da de alta una carta suelta a mano, sin depender de ningún set sincronizado", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mi colección", exact: true }).click();
  await page.getByRole("button", { name: "Cartas", exact: true }).click();
  await page.getByRole("button", { name: "+ Carta" }).click();

  await page.getByPlaceholder("Charizard").fill("Eevee");
  await page.getByPlaceholder("Base Set").fill("Jungla");
  await page.getByRole("button", { name: "Añadir a mi colección" }).click();

  await expect(page.getByText("Eevee")).toBeVisible();
});

test("marcar una carta como tuya en un checklist no la marca automáticamente en otro que comparta la misma carta", async ({ page }) => {
  // Bug real en producción (2026-07): un binder reúne un Pokémon de cualquier expansión
  // donde haya salido, así que si esa expansión también está sincronizada como set oficial
  // aparte, la misma carta real (mismo número+variante+expansión) aparece en las dos
  // listas — marcarla como tuya en una la marcaba automáticamente como tuya en la otra.
  // "Fake Slowbro" (binder) y "Fake Charizard" (set oficial "Test Set", ya sincronizado en
  // el primer test de este fichero) comparten a propósito número "2"+variante "holo"+"Test
  // Set" — el mismo caso real que Slowbro/Slowpoke de "Oscuridad Absoluta".
  await page.goto("/");
  await page.getByRole("button", { name: "Mi colección", exact: true }).click();
  await page.getByRole("button", { name: "Sets", exact: true }).click();

  // Fake Charizard ya está sincronizado (primer test) pero aún no marcado como propio.
  // Es variante "holo", así que su etiqueta accesible lleva el sufijo "(Holo)".
  await page.getByRole("button", { name: "Seleccionar varias" }).click();
  await page.getByRole("button", { name: "Marcar Fake Charizard (Holo) como mía" }).click();
  await page.getByRole("button", { name: "Marcar 1 como mías" }).click();

  await page.getByRole("button", { name: "+ Binder" }).click();
  await page.getByRole("textbox", { name: "Pokémon (separados por comas)" }).fill("Slowpoke, Slowbro");
  await page.getByRole("button", { name: "Crear binder" }).click();
  await page.getByRole("button", { name: "Cerrar" }).click();

  const binderCard = page.getByRole("group", { name: "Set Slowpoke y Slowbro" });
  await binderCard.getByRole("button", { name: "Que me faltan" }).click();
  // Fake Slowbro NO debe aparecer como tuya en el binder solo por serlo en "Test Set".
  await expect(binderCard.getByText("Fake Slowbro")).toBeVisible();
  await binderCard.getByRole("button", { name: "Que tengo" }).click();
  await expect(binderCard.getByText("Fake Slowbro")).not.toBeVisible();
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
