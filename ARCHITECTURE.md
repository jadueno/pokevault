# Arquitectura y decisiones técnicas

Este documento explica cómo está construido PokéVault y por qué — para el manual de uso día a día, ver el [README](README.md).

## Visión general

PokéVault es un gestor de colecciones Pokémon TCG: qué cartas y qué producto sellado posees, cuánto pagaste, cuánto valen (a tu propia estimación), y qué quieres conseguir a continuación. Nace de un brief mucho más ambicioso (multi-usuario, escáner de cartas, logros, compras/ventas con terceros...) que se recortó deliberadamente a lo que el propio usuario marcó como mínimo indispensable: registrar lo que tienes (carta suelta o sellado), de dónde salió, tu wishlist de deseos puntuales, y un plan de compra mensual.

La Fase 1 original tenía un catálogo sincronizado desde pokemontcg.io para buscar cartas y traer su precio de mercado. Se eliminó por completo (ver más abajo): el usuario decidió que no lo necesitaba y que prefería un flujo de "hacer una foto a lo que compro" con reconocimiento por IA local, buscando solo sobre sus propios productos.

```
Frontend (React + TS)  ──HTTP/JSON──▶  Backend (Fastify + TS)  ──SQL──▶  PostgreSQL
     dominio puro                        hexagonal                      (Docker)
                                              │
                                              └──▶ Ollama local (solo para /card-recognition)
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
| Reconocimiento de fotos | Ollama local (`minicpm-v` por defecto) | Gratis, privado (la foto nunca sale de tu máquina), mismo Ollama que ya usa `nous` |

## Rediseño visual: energía de Pokédex, identidad propia

A partir de una captura de referencia (una web de Pokédex: banner con degradado vivo, tarjetas con fondo degradado, insignias de color sólido, tipografía muy bold y redondeada), se trasladó esa energía visual a las pantallas ya existentes — **sin** reconstruir el listado de tipo catálogo que mostraba esa referencia, que es justo la funcionalidad que se eliminó deliberadamente (ver más abajo). El usuario confirmó explícitamente que quería solo el estilo, no la pantalla.

- **Paleta**: se mantiene "casi negro + rojo Poké Ball + dorado" (la identidad ya construida) en vez de adoptar el verde de la referencia, que solo aparecía porque el Pokémon protagonista de esa captura era de tipo planta.
- **`ScreenHeader`**: banner "hero" con degradado de marca (`--hero-gradient`), en Resumen/Colección/Wishlist/Añadir.
- **`Card variant="gradient"`**: tarjetas "protagonista" (carta, producto sellado, deseo, valor total) con fondo degradado oscuro y brillo de marca al pasar el ratón (`shadow-glow`); las tarjetas de utilidad (formularios, estados vacíos) se quedan planas para no competir en jerarquía visual.
- **`Badge`**: insignias de color sólido para metadatos cortos (idioma, estado de conservación, tipo de producto, prioridad de wishlist, confianza del reconocimiento por IA).
- **Tipografía**: Baloo 2 (`--font-display`) para títulos de pantalla, nombres de carta/producto y cifras protagonistas; Inter se mantiene para formularios y datos densos, donde es más legible.

## Arquitectura hexagonal (backend)

```
backend/src/
  domain/           tipos + puertos (VisualMatchProvider, repositorios) — cero dependencias externas
  application/      casos de uso: validación de negocio + orquestación
  infrastructure/
    db/             pool de conexión, migraciones, repositorios Postgres
    vision/         proveedor de reconocimiento por foto (real Ollama + fake)
    http/           servidor Fastify, rutas HTTP
```

## Sin catálogo externo: por qué se quitó y qué lo sustituye

La Fase 1 original cacheaba localmente el catálogo de pokemontcg.io (`catalog_sets`/`catalog_cards`) para poder buscar cartas y traer su precio de mercado. Al usar la app de verdad, el usuario decidió que esa funcionalidad no le hacía falta: no navega un catálogo global, hace una foto a lo que acaba de comprar. Se eliminó por completo (migración `1784000000008_replace-catalog-with-freeform-items`): sin `catalog_sets`/`catalog_cards`/`catalog_sync_log`, sin `sync:catalog`, sin `CatalogProvider`.

En su lugar:

1. **`collection_items`/`wishlist_items` guardan sus propios datos directamente** (`name`, `setName`, `number`, `rarity`) en vez de un `catalog_card_id` — no hay nada externo con lo que enlazarlos. `sealed_purchases` pierde su `catalog_set_id` (siempre había sido opcional y sin uso real en el frontend).
2. **"Añadir" es un flujo de foto → reconocimiento → confirmación manual**, nunca alta automática. `VisualMatchProvider` es un puerto intercambiable (mismo patrón que `infrastructure/llm/` en `nous`, con proveedores de IA intercambiables): `ollamaVisionProvider.ts` es el adaptador real (fetch crudo a `/api/chat` de Ollama con la imagen en base64 y `format: "json"`, sin SDK), `fakeVisionProvider.ts` es un fixture determinista para tests/E2E.
3. **Sin precio de mercado automático.** Sin catálogo no hay de dónde traerlo — el valor de cada ejemplar es siempre `estimatedValueOverride`, la estimación del propio usuario (mismo campo, mismo patrón que ya usaba `sealed_purchases`, que nunca tuvo precio de catálogo). `resolveItemEstimatedValue` (la función que elegía entre corrección manual y precio de catálogo) desaparece: ya no hay nada que "overridear".
4. **La búsqueda ahora es sobre tus propios productos**: `ColeccionScreen` y `SelladoScreen` tienen su propio filtro por nombre en cliente, sin pantalla ni endpoint aparte — no hace falta indexar nada en el servidor para el volumen de una colección personal.

## Reconocimiento de fotos: Ollama local, siempre con revisión manual

`POST /card-recognition` recibe una foto como data URL (comprimida en el cliente antes de enviarla, `src/data/imageCapture.ts` — redimensiona a 1024px máx. vía canvas, sin librería) y devuelve `{name, setName, number, rarity, confidence}`, todos nullable. El prompt (`infrastructure/vision/ollamaVisionProvider.ts`) le pide al modelo JSON estricto y le insiste en no inventar nada que no vea en la imagen.

Reglas explícitas:

- **Nunca dar de alta nada automáticamente.** El resultado se muestra en `AnadirScreen` como sugerencia; el usuario elige el destino (colección/wishlist/sellado) y revisa/edita cada campo en un formulario normal antes de guardar — el flujo funciona igual de bien si el reconocimiento falla o viene todo a `null`, solo que hay que rellenar más a mano.
- **`minicpm-v` por defecto** porque, de los modelos de visión habituales en Ollama (`llava`, `llama3.2-vision`, `qwen2.5vl`, `minicpm-v`, `moondream`), es de los que mejor lee texto pequeño (nombre/número/rareza impresos en la carta) para su tamaño — probado con una foto real de un Charizard de Base Set: identificó el nombre correctamente, con número y rareza aproximados (esperable de un modelo local pequeño, de ahí que la revisión manual sea obligatoria, no opcional).
- **Sin Ollama configurado, cae al proveedor fake** (mismo criterio que `nous`): la app sigue funcionando, solo que sin sugerencias — nunca un error duro por no tener IA instalada.
- **El E2E fuerza el fake** (`OLLAMA_BASE_URL=""` en `playwright.config.ts`), determinista y sin red, aunque el `.env` local del desarrollador tenga Ollama configurado.

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

Al importar el plan de compra real del usuario (agosto 2026 - julio 2027) resultó que casi ningún ítem es una carta concreta: son accesorios (fundas, toploaders, archivador), cantidades por rareza ("9x Illustration Rare de temática cotidiana"), producto sellado con una acción asociada (comprar/abrir/guardar), o una carta a elegir entre varias opciones ("Pikachu, Gengar, Mew, Dragonite, Lugia o Charizard"). Nada de eso encaja en `wishlist_items`, que es un deseo puntual de una cosa concreta.

Por eso el plan vive en sus propias tablas, independientes de la wishlist:

- **`plan_items`**: `month` (`"YYYY-MM"`), `category` (`comprar`/`abrir`/`guardar_sellado`, el mismo desglose que usa el propio plan del usuario), `description` (texto libre), `done`, `position` (orden dentro de mes+categoría).
- **`plan_settings`** (singleton, mismo patrón que `profile`): presupuesto mensual, páginas de compra habituales (`shopping_links`, `[{label, url}]`) y las dos notas generales del plan (reglas del año, objetivo final) que no pertenecen a ningún mes concreto.

**"Hecho" es una casilla independiente, no un alias de "Ya la tengo".** Wishlist usa `moveToCollection` para pasar un deseo a la colección real (exige idioma/estado/precio y cuenta en el dashboard). El plan es solo seguimiento de una lista de la compra: `toggleDone` (`application/planItems.ts`) marca/desmarca sin tocar `collection_items` ni `sealed_purchases`, y por tanto sin afectar a `totalValue`/`totalInvested`. Decisión explícita del usuario al preguntarle cómo debía comportarse "marcar como hecho".

La wishlist sigue teniendo su propio uso, distinto del plan: deseos puntuales de algo que todavía no se tiene, fuera de lo ya planificado mes a mes.

## Rigor de pruebas: bugs reales encontrados, no solo cobertura

- El bug de fechas de arriba, con test de regresión en `server.test.ts` que compara la fecha exacta enviada contra la devuelta.
- Al escribir el E2E original (con catálogo), se encontró que el modal de detalle de carta no se cerraba al añadir a la wishlist — bug de UX real corregido en su momento, antes de que esa pantalla se eliminara junto con el catálogo.
- El reconocimiento por foto se probó con una imagen real (Charizard de Base Set) contra el Ollama local, no solo con el fake — confirmó que el prompt y el parseo de JSON funcionan con una respuesta real del modelo, no solo con el fixture determinista.

## Estructura del repositorio

- `src/domain/` — tipos y cálculos puros (`formatMoney`, `groupWishlistByMonth`, `groupPlanByMonth`).
- `src/data/` — un hook por área (`useCollectionData`, `useWishlistData`, `useSealedData`, `usePlanData`) + `api.ts` + `imageCapture.ts` (compresión de fotos en cliente).
- `src/features/` — una pantalla por carpeta: `anadir/` (foto + reconocimiento + confirmación), `coleccion/`, `wishlist/`, `sellado/`, `dashboard/`, `plan/`.
- `backend/src/domain|application|infrastructure/` — ver arquitectura hexagonal arriba.
- `docker-compose.yml` — Postgres local, puerto 5436.

## Roadmap (no construido todavía, documentado a propósito)

- **Fase 2 — Progreso y organización**: vista grid/lista con agrupar/ordenar/filtrar avanzado, estadísticas (carta más valiosa, distribución por rareza/idioma). Solo lecturas nuevas sobre datos que ya existen.
- **Fase 3 — Dinero histórico**: `collection_value_snapshots` para la evolución del valor en el tiempo, transacciones de compra/venta/intercambio con terceros (comisiones, envío, beneficio neto), presupuesto mensual vs gasto real (complementa el plan, que es planificación *antes* de comprar, con seguimiento de lo *ya* gastado).
- **Fase 4 — Multi-usuario real**: el día que se decida abrir a otros coleccionistas (ver sección de auth arriba).
- **Fase 5 — Mejorar el reconocimiento**: recorte automático de la foto antes de enviarla al modelo (mejora la lectura de texto pequeño), comparar varios modelos de Ollama para ver cuál acierta más con cartas reales, quizás un modelo de pago con visión como opción adicional (mismo puerto `VisualMatchProvider`, solo añadir un adaptador).
