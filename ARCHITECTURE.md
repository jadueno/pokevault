# Arquitectura y decisiones técnicas

Este documento explica cómo está construido PokéVault y por qué — para el manual de uso día a día, ver el [README](README.md).

## Visión general

PokéVault es un gestor de colecciones Pokémon TCG: qué cartas y qué producto sellado posees, cuánto pagaste, cuánto valen (a tu propia estimación), y qué quieres conseguir a continuación. Nace de un brief mucho más ambicioso (multi-usuario, escáner de cartas, logros, compras/ventas con terceros...) que se recortó deliberadamente a lo que el propio usuario marcó como mínimo indispensable: registrar lo que tienes (carta suelta o sellado), de dónde salió, tu wishlist de deseos puntuales, y un plan de compra mensual.

La Fase 1 original tenía un catálogo sincronizado desde pokemontcg.io para buscar cartas y traer su precio de mercado. Se eliminó por completo (ver más abajo): el usuario decidió que no lo necesitaba. Más adelante volvió a hacer falta una pieza de ese proveedor, pero de forma acotada y explícita: buscar un set, confirmarlo de una lista de candidatos, y descargar su listado de cartas (con precio de referencia) una vez — nunca un catálogo en vivo ni una llamada automática (ver "Checklist de set" más abajo).

```
Frontend (React + TS)  ──HTTP/JSON──▶  Backend (Fastify + TS)  ──SQL──▶  PostgreSQL
     dominio puro                        hexagonal                      (Docker)
                                              │
                                              └──▶ pokemontcg.io (solo al buscar/sincronizar un set, a propósito)
```

## Stack y por qué

| Capa | Elección | Motivo |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | Mismo criterio que rumbo/nous/faro: rápido de iterar, tipado de extremo a extremo |
| Estilos | Tailwind v4 + variables CSS | Paleta propia ("vitrina de coleccionista": casi negro + rojo Poké Ball + dorado), distinta del resto del portfolio. Rediseño "energía de Pokédex" (banners `ScreenHeader` con degradado de marca, tarjetas `Card variant="gradient"`, insignias `Badge`, tipografía de titulares Baloo 2) sobre esa misma paleta — ver más abajo |
| Backend | Node + TypeScript + Fastify | Overhead mínimo, mismo patrón que los tres hermanos |
| Base de datos | PostgreSQL en Docker (local) | Herramienta personal, sin despliegue público |
| Migraciones | `node-pg-migrate` | Versionadas en TypeScript |
| Sin ORM | Repositorio con `pg` + SQL explícito | Volumen pequeño, un solo usuario; un ORM no aporta nada aquí |
| Datos de set | pokemontcg.io, solo en acciones explícitas | Gratis; ~45%/~8s de error/latencia media documentados, por eso nunca se llama en una petición normal de la app, solo al buscar/sincronizar un set a propósito |

## Rediseño visual: energía de Pokédex, identidad propia

A partir de una captura de referencia (una web de Pokédex: banner con degradado vivo, tarjetas con fondo degradado, insignias de color sólido, tipografía muy bold y redondeada), se trasladó esa energía visual a las pantallas ya existentes — **sin** reconstruir el listado de tipo catálogo que mostraba esa referencia, que es justo la funcionalidad que se eliminó deliberadamente (ver más abajo). El usuario confirmó explícitamente que quería solo el estilo, no la pantalla.

- **Paleta**: se mantiene "casi negro + rojo Poké Ball + dorado" (la identidad ya construida) en vez de adoptar el verde de la referencia, que solo aparecía porque el Pokémon protagonista de esa captura era de tipo planta.
- **`ScreenHeader`**: banner "hero" con degradado de marca (`--hero-gradient`), en Resumen/Colección/Wishlist.
- **`Card variant="gradient"`**: tarjetas "protagonista" (carta, producto sellado, deseo, valor total) con fondo degradado oscuro y brillo de marca al pasar el ratón (`shadow-glow`); las tarjetas de utilidad (formularios, estados vacíos) se quedan planas para no competir en jerarquía visual.
- **`Badge`**: insignias de color sólido para metadatos cortos (idioma, estado de conservación, tipo de producto, prioridad de wishlist).
- **Tipografía**: Baloo 2 (`--font-display`) para títulos de pantalla, nombres de carta/producto y cifras protagonistas; Inter se mantiene para formularios y datos densos, donde es más legible.

## Arquitectura hexagonal (backend)

```
backend/src/
  domain/           tipos + puertos (PokemonTcgProvider, repositorios) — cero dependencias externas
  application/      casos de uso: validación de negocio + orquestación
  infrastructure/
    db/             pool de conexión, migraciones, repositorios Postgres
    catalog/        proveedor de datos de set (real pokemontcg.io + fake)
    http/           servidor Fastify, rutas HTTP
```

## Sin catálogo externo: por qué se quitó y qué lo sustituye

La Fase 1 original cacheaba localmente el catálogo de pokemontcg.io (`catalog_sets`/`catalog_cards`) para poder buscar cartas y traer su precio de mercado. Al usar la app de verdad, el usuario decidió que esa funcionalidad no le hacía falta: no navega un catálogo global, hace una foto a lo que acaba de comprar. Se eliminó por completo (migración `1784000000008_replace-catalog-with-freeform-items`): sin `catalog_sets`/`catalog_cards`/`catalog_sync_log`, sin `sync:catalog`, sin `CatalogProvider`.

En su lugar:

1. **`collection_items`/`wishlist_items` guardan sus propios datos directamente** (`name`, `setName`, `number`, `rarity`) en vez de un `catalog_card_id` — no hay FK hacia nada externo. `sealed_purchases` pierde su `catalog_set_id` (siempre había sido opcional y sin uso real en el frontend).
2. **Dar de alta una carta pasa siempre por revisión manual antes de guardar**, nunca alta automática — primero fue foto + reconocimiento por IA (se quitó después, ver más abajo), ahora es elegir del checklist de un set sincronizado (con foto y precio oficiales ya rellenos, pero editable) o un formulario de texto libre para lo que no está en ningún set.
3. **Sin precio de mercado automático salvo el que trae el checklist de un set sincronizado.** El valor de cada ejemplar es `estimatedValueOverride` — al marcar varias cartas de golpe desde un set se prerellena con el precio de referencia de Cardmarket del momento de la sincronización (si el proveedor lo tenía), pero sigue siendo un campo editable como cualquier otro, nunca un "precio oficial" que no se pueda corregir.
4. **La búsqueda del día a día sigue siendo sobre tus propios productos**: `ColeccionScreen` tiene su propio filtro por nombre en cliente, sin pantalla ni endpoint aparte. La búsqueda contra pokemontcg.io (`GET /set-search`) es una cosa distinta y explícita: solo para encontrar y elegir un set nuevo que sincronizar, nunca para buscar cartas sueltas.

## Checklist de set ("¿qué me falta?"): la vía principal de alta de cartas

Pedido explícito del usuario: ver qué cartas le faltan de un set concreto (p. ej. "Oscuridad Absoluta") y poder marcar de golpe las que ya tiene, con su precio aproximado. Esto **no revierte** la decisión de quitar el catálogo — sigue siendo una pieza deliberadamente acotada, no un catálogo en vivo:

- **Búsqueda con confirmación explícita, nunca una suposición.** La primera versión de esto intentaba adivinar el set a partir del texto que el usuario escribiera — se descartó tras comprobar en vivo que pokemontcg.io solo tiene nombres en inglés (`GET /v2/sets?q=name:"Oscuridad Absoluta"` da 0 resultados) y una coincidencia forzada podría sincronizar el set equivocado. En su lugar: `GET /set-search?q=...` hace una búsqueda parcial (`name:*query*`, sí funciona bien para texto en inglés — probado en vivo, "black" devuelve 12 candidatos razonables) y el usuario **elige de una lista real** antes de confirmar `POST /set-checklists`.
- **El precio viene gratis en la misma respuesta.** `card.cardmarket.prices.averageSellPrice` (EUR) ya está en el payload que se usa para traer las cartas del set — no hace falta ninguna llamada aparte. Sin conversión de divisa ni fallback a tcgplayer/USD: si el proveedor no tiene precio de Cardmarket para una carta (habitual en sets recién salidos, sin datos de mercado todavía), se deja `null` antes que inventar una cifra en otra divisa.
- **`set_checklists`/`set_checklist_cards`** (migraciones `1784000000009`/`1784000000013`) se escriben a través de `SetChecklistRepository.upsertChecklist` (reemplazo completo: borra y reinserta, evita duplicados), llamado desde `POST /set-checklists` (set nuevo) o `POST /set-checklists/:id/resync` (volver a traer un set ya sincronizado, p. ej. para rellenar precio en uno sincronizado antes de que ese campo existiera).
- **`PokemonTcgProvider`** es un puerto intercambiable (mismo patrón que `infrastructure/llm/` en `nous`): `pokemonTcgApiProvider.ts` es el adaptador real (`fetch` con `AbortSignal.timeout(10000)`, dado el ~8s de latencia media documentado), `fakePokemonTcgProvider.ts` es un fixture determinista (un único set fijo "Test Set"/"ts1") para tests/E2E — forzado con `POKEMON_TCG_PROVIDER=fake` en `playwright.config.ts`, nunca contra la red real en CI.
- **No hay FK hacia `collection_items`.** Como la colección es freeform (nombre del set en cualquier idioma o forma), "qué tengo de este set" se calcula en el frontend (`computeSetChecklistCompletion`, `src/domain/calculations.ts`) comparando por **número de carta** — universal, no depende del idioma — dentro de los ejemplares cuyo `setName` se parece (contención de texto, insensible a mayúsculas/acentos) al nombre del set en inglés o al alias guardado al sincronizar. Ese alias (`set_name_es`) es literalmente el texto que el usuario escribió para encontrar el set, no una traducción — así la siguiente carta del mismo set se sigue relacionando en local aunque se escriba distinto al nombre oficial en inglés.
- **Marcar varias como mías** (`SetCardsGrid` en `SetChecklistTab.tsx`) construye un `NewCollectionItem` por carta seleccionada con valores por defecto (español, Near Mint, x1, sin precio de compra, foto y precio de referencia del checklist) y los crea todos en paralelo (`useCollectionData.addItems`) con un único `reload()` al final, en vez de uno por alta.

## Reconocimiento de fotos por IA: se probó, se quitó

Hubo una fase intermedia con un flujo "hacer una foto → reconocimiento por IA (Ollama local) → revisión manual" para las tres altas (carta, wishlist, sellado), con un puerto `VisualMatchProvider` y su propio adaptador real/fake. Tras usar la app de verdad, el usuario decidió quitarlo: "complica todo mucho y no aporta nada" frente a elegir directamente del checklist de un set (más preciso, con foto y precio oficiales) o rellenar un formulario corto a mano. Se eliminó por completo: puerto, adaptadores, ruta `/card-recognition`, componente `PhotoCapture`, tipos `RecognizedCardData`/`RecognitionConfidence`. `src/data/imageCapture.ts` (compresión de fotos en cliente) se mantiene — lo sigue usando `PhotoField`, el adjuntar-foto-a-mano de producto sellado/wishlist, que es una cosa distinta (sin IA, nunca lo fue).

## Sin autenticación multi-usuario (todavía)

A diferencia del resto del brief original (que planteaba un producto abierto a otros coleccionistas), la app es **single-tenant**, exactamente igual que rumbo/nous/faro: mismo `registerAuth(app, token)` con un token bearer fijo opcional, sin tabla `users`, sin `user_id` en ninguna tabla. Decisión explícita del usuario al revisar el plan inicial ("por ahora solo la voy a usar yo").

Si algún día se abre a otros usuarios, la migración queda documentada (no construida): añadir `users`+`sessions`, añadir `user_id` a `collection_items`/`wishlist_items`/`sealed_purchases` (nullable primero, backfill a un único usuario, luego `not null`), `collections` con visibilidad (`private`/`unlisted`/`public`), y login vía Google OAuth con sesión en base de datos (cookie con token opaco, no JWT — para poder revocar una sesión al momento sin mantener una denylist aparte).

## Reglas de negocio del dinero

- **Cada alta en la colección es una fila nueva.** El caso de uso `create` de `collectionItems`/`sealedPurchases` nunca actualiza el `purchasePrice` de una fila existente — así nunca se pisa un precio de compra histórico.
- **"Vino de un sobre" no inventa un precio.** `acquisitionType='pulled_from_pack'` deja `purchasePrice` en `null` en vez de rellenarlo con 0 — no se sabe cuánto costó *esa carta en concreto* dentro de un sobre de varias, y mentir con un 0 sería peor que no saberlo. Opcionalmente se vincula (`sealedPurchaseId`) a la compra del sobre del que salió, sin prorratear el coste automáticamente.
- **El valor estimado siempre es una estimación del usuario, identificada como tal.** `estimatedValueOverride` + `estimatedValueOverrideAt` + `estimatedValueOverrideNote` — sin catálogo externo no hay "precio oficial" que corregir, así que este campo es la única fuente de valor, nunca silenciosa.
- **Sin valor conocido no es lo mismo que valor cero.** `CollectionSummary.itemsWithoutValue` cuenta aparte los ejemplares sin `estimatedValueOverride` — el dashboard avisa de ellos en vez de sumarlos como 0€ sin decir nada.
- **Cartas graduadas son ejemplares propios.** No se fusionan con una copia no graduada de la misma carta — cada fila de `collection_items` es un objeto físico distinto.

## Bug real encontrado: columnas `date` de Postgres

Las primeras migraciones usaban `date` para `purchase_date`. Al leer una fila de vuelta con `pg` y pasarla por `new Date(...).toISOString()`, el valor se desplazaba un día según la zona horaria del proceso (España, UTC+1/+2) — una compra registrada el 1 de julio volvía como 30 de junio. Detectado probando el flujo completo con datos reales (ver `server.test.ts`, test de regresión explícito). Se corrigió cambiando esas columnas a `text` (formato `"YYYY-MM-DD"`, sin pasar por el parser de fechas de `pg` ni por `Date` de JS en ningún punto) — mismo criterio ya documentado como gotcha conocido en esta familia de proyectos.

## Objetivo de compra mensual sin tabla nueva

`wishlist_items.target_month` (`"YYYY-MM"`, nullable) es toda la funcionalidad: la pantalla "Wishlist" agrupa por ese campo (`groupWishlistByMonth`, `src/domain/calculations.ts`) para dar directamente "en agosto quiero esto, en septiembre esto otro", reutilizando prioridad y precio máximo que ya existían. No hace falta una entidad de planificación aparte.

## "Plan" vs "Wishlist": por qué son dos cosas distintas

Al importar el plan de compra real del usuario (agosto 2026 - julio 2027) resultó que casi ningún ítem es una carta concreta: son accesorios (fundas, toploaders, archivador), cantidades por rareza ("9x Illustration Rare de temática cotidiana"), producto sellado con una acción asociada (comprar/guardar), o una carta a elegir entre varias opciones ("Pikachu, Gengar, Mew, Dragonite, Lugia o Charizard"). Nada de eso encaja en `wishlist_items`, que es un deseo puntual de una cosa concreta.

Por eso el plan vive en sus propias tablas, independientes de la wishlist:

- **`plan_items`**: `month` (`"YYYY-MM"`), `category` (`comprar`/`guardar_sellado`, el mismo desglose que usa el propio plan del usuario — la categoría "abrir" se retiró por no aportar distinción real sobre "comprar"), `description` (texto libre), `done`, `position` (orden dentro de mes+categoría).
- **`plan_settings`** (singleton, mismo patrón que `profile`): presupuesto mensual, páginas de compra habituales (`shopping_links`, `[{label, url}]`) y las dos notas generales del plan (reglas del año, objetivo final) que no pertenecen a ningún mes concreto.

**"Hecho" es una casilla independiente, no un alias de "Ya la tengo".** Wishlist usa `moveToCollection` para pasar un deseo a la colección real (exige idioma/estado/precio y cuenta en el dashboard). El plan es solo seguimiento de una lista de la compra: `toggleDone` (`application/planItems.ts`) marca/desmarca sin tocar `collection_items` ni `sealed_purchases`, y por tanto sin afectar a `totalValue`/`totalInvested`. Decisión explícita del usuario al preguntarle cómo debía comportarse "marcar como hecho".

La wishlist sigue teniendo su propio uso, distinto del plan: deseos puntuales de algo que todavía no se tiene, fuera de lo ya planificado mes a mes.

## Rigor de pruebas: bugs reales encontrados, no solo cobertura

- El bug de fechas de arriba, con test de regresión en `server.test.ts` que compara la fecha exacta enviada contra la devuelta.
- Al escribir el E2E original (con catálogo), se encontró que el modal de detalle de carta no se cerraba al añadir a la wishlist — bug de UX real corregido en su momento, antes de que esa pantalla se eliminara junto con el catálogo.
- Al construir la búsqueda de sets se comprobó en vivo contra la API real (no solo se asumió) tanto el payload de precio (`card.cardmarket.prices.averageSellPrice`, presente en sets antiguos, ausente en uno recién salido) como el fallo de la búsqueda por nombre en español — esas dos comprobaciones cambiaron el diseño antes de escribir código, no después.
- Con la colección/sellado/wishlist totalmente vacíos, la barra de pestañas de "Mi colección" se ocultaba por completo (condición heredada de cuando "Sets" era secundario), dejando sin forma de llegar a la pestaña "Sets" pese a que el propio mensaje de vacío la mencionaba — encontrado ejecutando el E2E nuevo de principio a fin, no solo con tests de componente aislados.

## Estructura del repositorio

- `src/domain/` — tipos y cálculos puros (`formatMoney`, `groupWishlistByMonth`, `groupPlanByMonth`, `computeSetChecklistCompletion`).
- `src/data/` — un hook por área (`useCollectionData`, `useWishlistData`, `useSealedData`, `usePlanData`, `useSetChecklistData`) + `api.ts` + `imageCapture.ts` (compresión de fotos en cliente, usada por el adjuntar-foto-a-mano de `PhotoField`).
- `src/features/` — una pantalla por carpeta: `coleccion/` (incluye `SetChecklistTab.tsx` y el alta manual de carta), `wishlist/`, `sellado/`, `dashboard/`, `plan/`.
- `backend/src/domain|application|infrastructure/` — ver arquitectura hexagonal arriba.
- `docker-compose.yml` — Postgres local, puerto 5436.

## Roadmap (no construido todavía, documentado a propósito)

- **Fase 2 — Progreso y organización**: vista grid/lista con agrupar/ordenar/filtrar avanzado, estadísticas (carta más valiosa, distribución por rareza/idioma). Solo lecturas nuevas sobre datos que ya existen.
- **Fase 3 — Dinero histórico**: `collection_value_snapshots` para la evolución del valor en el tiempo, transacciones de compra/venta/intercambio con terceros (comisiones, envío, beneficio neto), presupuesto mensual vs gasto real (complementa el plan, que es planificación *antes* de comprar, con seguimiento de lo *ya* gastado).
- **Fase 4 — Multi-usuario real**: el día que se decida abrir a otros coleccionistas (ver sección de auth arriba).
- **Fase 5 — Ampliar la búsqueda de sets**: una tabla de alias ES/EN curada a mano (no adivinada) para que la búsqueda encuentre sets aunque se escriban en español, actualización automática periódica de precio de los sets ya sincronizados (hoy es manual, botón "🔄 Actualizar").
