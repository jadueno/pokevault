import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmProvider } from "../../components/ConfirmProvider";
import type { CollectionItem, SealedPurchase, SetChecklist, SetChecklistCard, SetSearchCandidate } from "../../domain/types";
import { ColeccionScreen } from "./ColeccionScreen";

vi.mock("../../data/imageCapture", () => ({
  compressImage: vi.fn().mockResolvedValue("data:image/jpeg;base64,AAAA"),
}));

function item(overrides: Partial<CollectionItem> = {}): CollectionItem {
  return {
    id: "i1",
    name: "Charizard",
    setName: "Base",
    number: "4",
    rarity: "Rare Holo",
    language: "es",
    condition: "near_mint",
    quantity: 1,
    acquisitionType: "purchased_single",
    sealedPurchaseId: null,
    purchasePrice: 300,
    purchaseCurrency: "EUR",
    purchaseDate: "2026-07-01",
    isGraded: false,
    gradingCompany: null,
    grade: null,
    estimatedValueOverride: 350,
    estimatedValueOverrideAt: null,
    estimatedValueOverrideNote: null,
    notes: null,
    photo: null,
    ...overrides,
  };
}

function sealedItem(overrides: Partial<SealedPurchase> = {}): SealedPurchase {
  return {
    id: "s1",
    productName: "Sobre Evoluciones Prismáticas",
    productType: "booster_pack",
    quantity: 1,
    purchasePrice: 5.5,
    purchaseCurrency: "EUR",
    purchaseDate: "2026-07-01",
    estimatedValueOverride: null,
    estimatedValueOverrideAt: null,
    estimatedValueOverrideNote: null,
    location: "Cajón",
    notes: null,
    photo: null,
    ...overrides,
  };
}

function setChecklist(overrides: Partial<SetChecklist> = {}): SetChecklist {
  return {
    id: "cl1",
    externalSetId: "me5",
    setName: "Pitch Black",
    setNameEs: "Oscuridad Absoluta",
    totalCards: 3,
    syncedAt: "2026-07-18T00:00:00.000Z",
    ...overrides,
  };
}

function checklistCard(overrides: Partial<SetChecklistCard> = {}): SetChecklistCard {
  return {
    id: "c1",
    checklistId: "cl1",
    number: "1",
    name: "Tropius",
    rarity: "Common",
    imageUrl: null,
    imageUrlLarge: null,
    referencePrice: null,
    ...overrides,
  };
}

function searchCandidate(overrides: Partial<SetSearchCandidate> = {}): SetSearchCandidate {
  return {
    externalSetId: "me5",
    name: "Pitch Black",
    totalCards: 120,
    releaseDate: "2026/07/17",
    ...overrides,
  };
}

function renderScreen(
  items: CollectionItem[],
  sealedItems: SealedPurchase[] = [],
  checklists: SetChecklist[] = [],
  cardsByChecklist: Record<string, SetChecklistCard[]> = {},
) {
  const handlers = {
    onAddItem: vi.fn().mockResolvedValue(undefined),
    onUpdateItem: vi.fn().mockResolvedValue(undefined),
    onRemove: vi.fn().mockResolvedValue(undefined),
    onOverrideValue: vi.fn().mockResolvedValue(undefined),
    onAddSealed: vi.fn().mockResolvedValue(undefined),
    onUpdateSealed: vi.fn().mockResolvedValue(undefined),
    onRemoveSealed: vi.fn().mockResolvedValue(undefined),
    onOverrideSealedValue: vi.fn().mockResolvedValue(undefined),
    onSearchSets: vi.fn().mockResolvedValue([]),
    onSyncSet: vi.fn().mockResolvedValue(undefined),
    onResyncSet: vi.fn().mockResolvedValue(undefined),
    onMarkOwned: vi.fn().mockResolvedValue(undefined),
    onRemoveItems: vi.fn().mockResolvedValue(undefined),
  };
  render(
    <ConfirmProvider>
      <ColeccionScreen
        items={items}
        sealedItems={sealedItems}
        checklists={checklists}
        cardsByChecklist={cardsByChecklist}
        {...handlers}
      />
    </ConfirmProvider>,
  );
  return handlers;
}

describe("ColeccionScreen", () => {
  it("sin nada, la pestaña Sets (por defecto) explica cómo empezar", () => {
    renderScreen([], []);
    expect(screen.getByText(/Todavía no has sincronizado ningún set/)).toBeInTheDocument();
  });

  it("lista los ejemplares con precio de compra y valor estimado", async () => {
    const user = userEvent.setup();
    renderScreen([item()]);
    await user.click(screen.getByRole("button", { name: "Cartas (1)" }));
    expect(screen.getByText("Charizard")).toBeInTheDocument();
    expect(screen.getByText("300,00 €")).toBeInTheDocument();
    expect(screen.getByText("350,00 €")).toBeInTheDocument();
  });

  it("indica cuando un ejemplar no tiene precio de compra por haber salido de un sobre", async () => {
    const user = userEvent.setup();
    renderScreen([item({ purchasePrice: null, acquisitionType: "pulled_from_pack" })]);
    await user.click(screen.getByRole("button", { name: "Cartas (1)" }));
    expect(screen.getByText(/Sin precio \(salió de un sobre\)/)).toBeInTheDocument();
  });

  it("si la carta está vinculada a un sobre con precio, muestra el coste repartido en vez de 'sin precio'", async () => {
    const user = userEvent.setup();
    renderScreen(
      [
        item({ id: "i1", name: "Eevee", purchasePrice: null, acquisitionType: "pulled_from_pack", sealedPurchaseId: "s1" }),
        item({ id: "i2", name: "Pikachu", purchasePrice: null, acquisitionType: "pulled_from_pack", sealedPurchaseId: "s1" }),
      ],
      [sealedItem({ id: "s1", purchasePrice: 60 })],
    );
    await user.click(screen.getByRole("button", { name: "Cartas (2)" }));
    // 60 € repartidos entre 2 cartas = 30 € cada una.
    expect(screen.getAllByText(/≈30,00 €/)).toHaveLength(2);
    expect(screen.getAllByText(/repartido, 2 cartas/)).toHaveLength(2);
  });

  it("en la pestaña de sellado, muestra cuántas cartas están vinculadas al sobre y el coste por carta", async () => {
    const user = userEvent.setup();
    renderScreen(
      [item({ id: "i1", purchasePrice: null, acquisitionType: "pulled_from_pack", sealedPurchaseId: "s1" })],
      [sealedItem({ id: "s1", purchasePrice: 60 })],
    );

    await user.click(screen.getByRole("button", { name: /Sellado/ }));

    expect(screen.getByText(/1 carta de la colección vinculada a este sobre/)).toBeInTheDocument();
    expect(screen.getByText(/≈60,00 €\/carta/)).toBeInTheDocument();
  });

  it("pide confirmación antes de eliminar un ejemplar", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([item()]);

    await user.click(screen.getByRole("button", { name: "Cartas (1)" }));
    await user.click(screen.getByRole("button", { name: "Eliminar ejemplar de Charizard" }));
    expect(handlers.onRemove).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(handlers.onRemove).toHaveBeenCalledWith("i1");
  });

  it("permite corregir el valor estimado a mano", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([item()]);

    await user.click(screen.getByRole("button", { name: "Cartas (1)" }));
    await user.click(screen.getByText("350,00 €"));
    const input = screen.getByDisplayValue("350");
    await user.clear(input);
    await user.type(input, "400");
    await user.click(screen.getByRole("button", { name: "OK" }));

    expect(handlers.onOverrideValue).toHaveBeenCalledWith("i1", 400, "Corrección manual");
  });

  it("clic en la foto la abre en grande", async () => {
    const user = userEvent.setup();
    renderScreen([item({ photo: "data:image/jpeg;base64,AAAA" })]);

    await user.click(screen.getByRole("button", { name: "Cartas (1)" }));
    await user.click(screen.getByRole("button", { name: "Ver foto de Charizard en grande" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("el botón Editar de una carta abre el formulario precargado y guarda los cambios", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([item()]);

    await user.click(screen.getByRole("button", { name: "Cartas (1)" }));
    await user.click(screen.getByRole("button", { name: "Editar ejemplar de Charizard" }));
    expect(screen.getByDisplayValue("Charizard")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Base")).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue("Charizard");
    await user.clear(nameInput);
    await user.type(nameInput, "Charizard ex");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(handlers.onUpdateItem).toHaveBeenCalledWith("i1", expect.objectContaining({ name: "Charizard ex", setName: "Base" }));
  });

  it("al editar una carta sin foto propia coincidente con ningún set, se conserva la foto que ya tenía", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([item({ photo: "data:image/jpeg;base64,YAYA" })]);

    await user.click(screen.getByRole("button", { name: "Cartas (1)" }));
    await user.click(screen.getByRole("button", { name: "Editar ejemplar de Charizard" }));
    expect(screen.getByText(/Se mantiene la foto que ya tenía/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(handlers.onUpdateItem).toHaveBeenCalledWith("i1", expect.objectContaining({ photo: "data:image/jpeg;base64,YAYA" }));
  });

  it("el FAB de Cartas abre el alta manual y la envía", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([item()]);

    await user.click(screen.getByRole("button", { name: "Cartas (1)" }));
    await user.click(screen.getByRole("button", { name: "Añadir carta suelta" }));
    await user.type(screen.getByPlaceholderText("Charizard"), "Mew");
    await user.click(screen.getByRole("button", { name: "Añadir a mi colección" }));

    expect(handlers.onAddItem).toHaveBeenCalledWith(expect.objectContaining({ name: "Mew" }));
  });

  it("el botón Editar de un producto sellado abre el formulario precargado y guarda los cambios", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([item()], [sealedItem()]);

    await user.click(screen.getByRole("button", { name: "Sellado (1)" }));
    await user.click(screen.getByRole("button", { name: "Editar Sobre Evoluciones Prismáticas" }));
    expect(screen.getByDisplayValue("Sobre Evoluciones Prismáticas")).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue("Sobre Evoluciones Prismáticas");
    await user.clear(nameInput);
    await user.type(nameInput, "Sobre Evoluciones Prismáticas (ES)");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(handlers.onUpdateSealed).toHaveBeenCalledWith(
      "s1",
      expect.objectContaining({ productName: "Sobre Evoluciones Prismáticas (ES)", location: "Cajón" }),
    );
  });

  it("cartas y sellado están en pestañas separadas, con el recuento en cada una", async () => {
    const user = userEvent.setup();
    renderScreen([item()], [sealedItem()]);

    expect(screen.getByRole("button", { name: "Cartas (1)" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cartas (1)" }));
    expect(screen.getByText("Charizard")).toBeInTheDocument();
    expect(screen.queryByText("Sobre Evoluciones Prismáticas")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sellado (1)" }));
    expect(screen.getByText("Sobre Evoluciones Prismáticas")).toBeInTheDocument();
    expect(screen.queryByText("Charizard")).not.toBeInTheDocument();
  });

  it("el buscador filtra la pestaña activa", async () => {
    const user = userEvent.setup();
    renderScreen(
      [item({ id: "i1", name: "Charizard" }), item({ id: "i2", name: "Pikachu", estimatedValueOverride: 5 })],
      [sealedItem({ id: "s1", productName: "ETB Paldean Fates" })],
    );

    await user.click(screen.getByRole("button", { name: "Cartas (2)" }));
    await user.type(screen.getByPlaceholderText("Buscar en toda tu colección…"), "pika");

    expect(screen.getByText("Pikachu")).toBeInTheDocument();
    expect(screen.queryByText("Charizard")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sellado (1)" }));
    expect(screen.queryByText("ETB Paldean Fates")).not.toBeInTheDocument();
    expect(screen.getByText(/Sin resultados/)).toBeInTheDocument();
  });

  it("abre el formulario de nueva compra sellada y lo envía", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([item()], []);

    await user.click(screen.getByRole("button", { name: "Sellado (0)" }));
    await user.click(screen.getByRole("button", { name: "+ Compra" }));
    await user.type(screen.getByLabelText("Nombre del producto"), "Caja Escarlata y Púrpura");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(handlers.onAddSealed).toHaveBeenCalledWith(expect.objectContaining({ productName: "Caja Escarlata y Púrpura" }));
  });

  it("permite estimar el valor de una compra sellada cuando todavía no se conoce", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([item()], [sealedItem()]);

    await user.click(screen.getByRole("button", { name: "Sellado (1)" }));
    await user.click(screen.getByRole("button", { name: "Sin estimar" }));
    const input = screen.getByRole("spinbutton");
    await user.type(input, "8");
    await user.click(screen.getByRole("button", { name: "OK" }));

    expect(handlers.onOverrideSealedValue).toHaveBeenCalledWith("s1", 8, "Estimado a mano");
  });

  it("permite subir una foto a una compra sellada ya existente", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([item()], [sealedItem()]);

    await user.click(screen.getByRole("button", { name: "Sellado (1)" }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["foto"], "caja.jpg", { type: "image/jpeg" });
    await user.upload(input, file);

    expect(handlers.onUpdateSealed).toHaveBeenCalledWith("s1", expect.objectContaining({ photo: "data:image/jpeg;base64,AAAA" }));
  });

  it("en la pestaña de Sets, sin checklists sincronizados explica cómo pedir uno", async () => {
    const user = userEvent.setup();
    renderScreen([item()], [], []);

    await user.click(screen.getByRole("button", { name: "Sets (0)" }));

    expect(screen.getByText(/Todavía no has sincronizado ningún set/)).toBeInTheDocument();
  });

  it("en Sets, busca un set nuevo y lo añade al elegirlo de la lista", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([item()], [], []);
    handlers.onSearchSets.mockResolvedValue([searchCandidate()]);

    await user.click(screen.getByRole("button", { name: "Sets (0)" }));
    await user.click(screen.getByRole("button", { name: "+ Set" }));
    await user.type(screen.getByPlaceholderText("Nombre en inglés, p. ej. Pitch Black"), "Pitch Black");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(handlers.onSearchSets).toHaveBeenCalledWith("Pitch Black");
    expect(await screen.findByText("Pitch Black")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Añadir este set" }));
    expect(handlers.onSyncSet).toHaveBeenCalledWith("me5", "Pitch Black");
  });

  it("en Sets, un candidato ya sincronizado se marca como 'Ya lo tienes' en vez de poder añadirlo de nuevo", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([], [], [setChecklist()]);
    handlers.onSearchSets.mockResolvedValue([searchCandidate()]);

    await user.click(screen.getByRole("button", { name: "Sets (1)" }));
    await user.click(screen.getByRole("button", { name: "+ Set" }));
    await user.type(screen.getByPlaceholderText("Nombre en inglés, p. ej. Pitch Black"), "Pitch Black");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText("Ya lo tienes")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Añadir este set" })).not.toBeInTheDocument();
  });

  it("en Sets, un set incompleto se abre solo y uno completo se queda cerrado por defecto", async () => {
    const user = userEvent.setup();
    const incompleteCards: SetChecklistCard[] = [
      checklistCard({ id: "c1", number: "1", name: "Tropius" }),
      checklistCard({ id: "c2", number: "2", name: "Grubbin" }),
    ];
    const completeCards: SetChecklistCard[] = [checklistCard({ id: "c3", checklistId: "cl2", number: "1", name: "Charmander" })];
    const ownedItems = [
      item({ setName: "Oscuridad Absoluta", number: "1/120" }),
      item({ id: "i2", name: "Charmander", setName: "Base Completo", number: "1/1" }),
    ];
    renderScreen(
      ownedItems,
      [],
      [setChecklist(), setChecklist({ id: "cl2", externalSetId: "base1", setName: "Base Completo", setNameEs: null, totalCards: 1 })],
      { cl1: incompleteCards, cl2: completeCards },
    );

    await user.click(screen.getByRole("button", { name: "Sets (2)" }));

    // Incompleto (1 de 2): ya abierto, sin tener que pulsar nada.
    expect(screen.getByText("Grubbin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ocultar" })).toBeInTheDocument();
    // Completo (1 de 1): se queda cerrado hasta que se pulse.
    expect(screen.queryByText("Charmander")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver el set completo" })).toBeInTheDocument();
  });

  it("en Sets, el botón Actualizar de un checklist llama a onResyncSet", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([], [], [setChecklist()]);

    await user.click(screen.getByRole("button", { name: "Sets (1)" }));
    await user.click(screen.getByRole("button", { name: "Actualizar Oscuridad Absoluta" }));

    expect(handlers.onResyncSet).toHaveBeenCalledWith("cl1");
  });

  it("en la pestaña de Sets, muestra el progreso y al expandir el set completo (o 'Cargando…' si aún no han llegado las cartas)", async () => {
    const user = userEvent.setup();
    renderScreen([item({ setName: "Oscuridad Absoluta", number: "1/120" })], [], [setChecklist()]);

    await user.click(screen.getByRole("button", { name: "Sets (1)" }));
    expect(screen.getByText("Oscuridad Absoluta")).toBeInTheDocument();
    expect(screen.getByText("— / 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver el set completo" }));
    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("en la pestaña de Sets, muestra todo el set (tuyas y las que faltan) y atenúa/pone en blanco y negro solo las que faltan", async () => {
    const user = userEvent.setup();
    const cards: SetChecklistCard[] = [
      checklistCard({ id: "c1", number: "1", name: "Tropius" }),
      checklistCard({ id: "c2", number: "2", name: "Grubbin" }),
      checklistCard({ id: "c3", number: "3", name: "Charmander", rarity: "Rare" }),
    ];
    const ownedItems = [item({ setName: "Oscuridad Absoluta", number: "1/120" })];
    renderScreen(ownedItems, [], [setChecklist()], { cl1: cards });

    await user.click(screen.getByRole("button", { name: "Sets (1)" }));
    expect(screen.getByText("1/3 (33%)")).toBeInTheDocument();

    // El set está incompleto (le faltan 2 de 3), así que ya está abierto por defecto —
    // no hace falta pulsar "Ver el set completo".
    expect(screen.getByText("Tropius")).toBeInTheDocument();
    expect(screen.getByText("Grubbin")).toBeInTheDocument();
    expect(screen.getByText("Charmander")).toBeInTheDocument();

    const tropiusPlaceholder = screen.getByText("Tropius").closest("div")?.querySelector('[aria-hidden="true"]');
    const grubbinPlaceholder = screen.getByText("Grubbin").closest("div")?.querySelector('[aria-hidden="true"]');
    expect(tropiusPlaceholder?.className).not.toContain("opacity-60");
    expect(grubbinPlaceholder?.className).toContain("opacity-60");
  });

  it("en Sets, el filtro Que tengo/Que me faltan esconde las que no tocan", async () => {
    const user = userEvent.setup();
    const cards: SetChecklistCard[] = [
      checklistCard({ id: "c1", number: "1", name: "Tropius" }),
      checklistCard({ id: "c2", number: "2", name: "Grubbin" }),
    ];
    const ownedItems = [item({ setName: "Oscuridad Absoluta", number: "1/120" })];
    renderScreen(ownedItems, [], [setChecklist()], { cl1: cards });

    await user.click(screen.getByRole("button", { name: "Sets (1)" }));
    // Incompleto (1 de 2): ya está abierto por defecto.
    expect(screen.getByText("Tropius")).toBeInTheDocument();
    expect(screen.getByText("Grubbin")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Que me faltan" }));
    expect(screen.queryByText("Tropius")).not.toBeInTheDocument();
    expect(screen.getByText("Grubbin")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Que tengo" }));
    expect(screen.getByText("Tropius")).toBeInTheDocument();
    expect(screen.queryByText("Grubbin")).not.toBeInTheDocument();
  });

  it("en Sets, el buscador local filtra por número o nombre dentro del set", async () => {
    const user = userEvent.setup();
    const cards: SetChecklistCard[] = [
      checklistCard({ id: "c1", number: "1", name: "Tropius" }),
      checklistCard({ id: "c2", number: "2", name: "Grubbin" }),
    ];
    renderScreen([], [], [setChecklist()], { cl1: cards });

    await user.click(screen.getByRole("button", { name: "Sets (1)" }));
    // Incompleto (0 de 2): ya está abierto por defecto.
    await user.type(screen.getByPlaceholderText("Buscar por número o nombre…"), "grub");

    expect(screen.queryByText("Tropius")).not.toBeInTheDocument();
    expect(screen.getByText("Grubbin")).toBeInTheDocument();
  });

  it("en Sets, seleccionar varias y marcarlas como mías llama a onMarkOwned con los datos por defecto", async () => {
    const user = userEvent.setup();
    const cards: SetChecklistCard[] = [
      checklistCard({ id: "c1", number: "1", name: "Tropius", referencePrice: 1.5 }),
      checklistCard({ id: "c2", number: "2", name: "Grubbin", referencePrice: null }),
    ];
    const handlers = renderScreen([], [], [setChecklist({ totalCards: 2 })], { cl1: cards });

    await user.click(screen.getByRole("button", { name: "Sets (1)" }));
    // Incompleto (0 de 2): ya está abierto por defecto.
    await user.click(screen.getByRole("button", { name: "Seleccionar varias" }));
    await user.click(screen.getByRole("button", { name: "Marcar Tropius como mía" }));
    await user.click(screen.getByRole("button", { name: "Marcar 1 como mías" }));

    expect(handlers.onMarkOwned).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "Tropius",
        setName: "Oscuridad Absoluta",
        number: "1/2",
        language: "es",
        condition: "near_mint",
        estimatedValueOverride: 1.5,
      }),
    ]);
  });

  it("en Sets, seleccionar varias también permite desmarcar (quitar) las que ya tienes", async () => {
    const user = userEvent.setup();
    const cards: SetChecklistCard[] = [
      checklistCard({ id: "c1", number: "1", name: "Tropius" }),
      checklistCard({ id: "c2", number: "2", name: "Grubbin" }),
    ];
    const ownedItems = [item({ id: "i1", name: "Tropius", setName: "Oscuridad Absoluta", number: "1/120" })];
    const handlers = renderScreen(ownedItems, [], [setChecklist({ totalCards: 2 })], { cl1: cards });

    await user.click(screen.getByRole("button", { name: "Sets (1)" }));
    // Incompleto (1 de 2): ya está abierto por defecto.
    await user.click(screen.getByRole("button", { name: "Seleccionar varias" }));
    await user.click(screen.getByRole("button", { name: "Desmarcar Tropius" }));
    await user.click(screen.getByRole("button", { name: "Quitar 1 de mi colección" }));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(handlers.onRemoveItems).toHaveBeenCalledWith(["i1"]);
  });

  it("en Sets, seleccionar una mezcla de tenidas y que faltan muestra los dos botones de acción", async () => {
    const user = userEvent.setup();
    const cards: SetChecklistCard[] = [
      checklistCard({ id: "c1", number: "1", name: "Tropius" }),
      checklistCard({ id: "c2", number: "2", name: "Grubbin" }),
    ];
    const ownedItems = [item({ id: "i1", name: "Tropius", setName: "Oscuridad Absoluta", number: "1/120" })];
    renderScreen(ownedItems, [], [setChecklist({ totalCards: 2 })], { cl1: cards });

    await user.click(screen.getByRole("button", { name: "Sets (1)" }));
    await user.click(screen.getByRole("button", { name: "Seleccionar varias" }));
    await user.click(screen.getByRole("button", { name: "Desmarcar Tropius" }));
    await user.click(screen.getByRole("button", { name: "Marcar Grubbin como mía" }));

    expect(screen.getByRole("button", { name: "Marcar 1 como mías" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitar 1 de mi colección" })).toBeInTheDocument();
  });

  it("en la pestaña de Sets, hacer clic en una carta la abre en grande (prioriza la imagen de mayor resolución)", async () => {
    const user = userEvent.setup();
    const cards: SetChecklistCard[] = [
      checklistCard({
        id: "c2",
        number: "2",
        name: "Grubbin",
        imageUrl: "https://images.scrydex.com/pokemon/me5-2/small",
        imageUrlLarge: "https://images.scrydex.com/pokemon/me5-2/large",
      }),
    ];
    renderScreen([], [], [setChecklist({ totalCards: 1 })], { cl1: cards });

    await user.click(screen.getByRole("button", { name: "Sets (1)" }));
    // Incompleto (0 de 1): ya está abierto por defecto.
    await user.click(screen.getByRole("button", { name: "Ver Grubbin en grande" }));

    const zoomedImage = screen.getByRole("dialog", { name: "Grubbin" }).querySelector("img");
    expect(zoomedImage).toHaveAttribute("src", "https://images.scrydex.com/pokemon/me5-2/large");
  });
});
