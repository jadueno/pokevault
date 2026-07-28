# Arquitectura y decisiones técnicas

Este documento explica cómo está construido PokéVault y por qué — para el manual de uso día a día, ver el [README](README.md).

## Visión general

PokéVault es un gestor de colecciones Pokémon TCG: qué cartas y qué producto sellado posees, cuánto pagaste, cuánto valen (a tu propia estimación), y qué quieres conseguir a continuación. Nace de un brief mucho más ambicioso (multi-usuario, escáner de cartas, logros, compras/ventas con terceros...) que se recortó deliberadamente a lo que el propio usuario marcó como mínimo indispensable: registrar lo que tienes (carta suelta o sellado), de dónde salió, tu wishlist de deseos puntuales, y un plan de compra mensual.

La Fase 1 original tenía un catálogo sincronizado desde pokemontcg.io para buscar cartas y traer su precio de mercado. Se eliminó por completo (ver más abajo): el usuario decidió que no lo necesitaba. Más adelante volvió a hacer falta una pieza de un proveedor externo, pero de forma acotada y explícita: buscar un set, confirmarlo de una lista de candidatos, y descargar su listado de cartas (con precio de referencia) una vez — nunca un catálogo en vivo ni una llamada automática (ver "Checklist de set" más abajo). El proveedor concreto cambió de pokemontcg.io a TCGdex a los pocos días de construir esto, tras comprobar en vivo que era bastante más fiable y que buscaba directamente en español (ver esa misma sección).

```
Frontend (React + TS)  ──HTTP/JSON──▶  Backend (Fastify + TS)  ──SQL──▶  PostgreSQL
     dominio puro                        hexagonal                      (Docker)
                                              │
                                              └──▶ TCGdex (solo al buscar/sincronizar un set, a propósito)
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
| Datos de set | TCGdex, solo en acciones explícitas | Gratis, sin API key, busca directamente en español; sigue sin llamarse en una petición normal de la app, solo al buscar/sincronizar un set a propósito. Reemplazó a pokemontcg.io (~45%/~8s de error/latencia media documentados) por ser bastante más fiable en las pruebas hechas antes de cambiar |

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
    catalog/        proveedor de datos de set (real TCGdex + fake)
    http/           servidor Fastify, rutas HTTP
```

## Sin catálogo externo: por qué se quitó y qué lo sustituye

La Fase 1 original cacheaba localmente el catálogo de pokemontcg.io (`catalog_sets`/`catalog_cards`) para poder buscar cartas y traer su precio de mercado. Al usar la app de verdad, el usuario decidió que esa funcionalidad no le hacía falta: no navega un catálogo global, hace una foto a lo que acaba de comprar. Se eliminó por completo (migración `1784000000008_replace-catalog-with-freeform-items`): sin `catalog_sets`/`catalog_cards`/`catalog_sync_log`, sin `sync:catalog`, sin `CatalogProvider`.

En su lugar:

1. **`collection_items`/`wishlist_items` guardan sus propios datos directamente** (`name`, `setName`, `number`, `rarity`) en vez de un `catalog_card_id` — no hay FK hacia nada externo. `sealed_purchases` pierde su `catalog_set_id` (siempre había sido opcional y sin uso real en el frontend).
2. **Dar de alta una carta pasa siempre por revisión manual antes de guardar**, nunca alta automática — primero fue foto + reconocimiento por IA (se quitó después, ver más abajo), ahora es elegir del checklist de un set sincronizado (con foto y precio oficiales ya rellenos, pero editable) o un formulario de texto libre para lo que no está en ningún set.
3. **Sin precio de mercado automático salvo el que trae el checklist de un set sincronizado.** El valor de cada ejemplar es `estimatedValueOverride` — al marcar varias cartas de golpe desde un set se prerellena con el precio de referencia de Cardmarket del momento de la sincronización (si el proveedor lo tenía), pero sigue siendo un campo editable como cualquier otro, nunca un "precio oficial" que no se pueda corregir.
4. **La búsqueda del día a día sigue siendo sobre tus propios productos**: `ColeccionScreen` tiene su propio filtro por nombre en cliente, sin pantalla ni endpoint aparte. La búsqueda contra el proveedor externo (`GET /set-search`) es una cosa distinta y explícita: solo para encontrar y elegir un set nuevo que sincronizar, nunca para buscar cartas sueltas.

## Checklist de set ("¿qué me falta?"): la vía principal de alta de cartas

Pedido explícito del usuario: ver qué cartas le faltan de un set concreto (p. ej. "Oscuridad Absoluta") y poder marcar de golpe las que ya tiene, con su precio aproximado. Esto **no revierte** la decisión de quitar el catálogo — sigue siendo una pieza deliberadamente acotada, no un catálogo en vivo:

- **Búsqueda con confirmación explícita, nunca una suposición.** El set nunca se adivina a partir del texto que escribe el usuario — `GET /set-search?q=...` devuelve una lista de candidatos reales y el usuario **elige** antes de confirmar `POST /set-checklists`. Esto importó especialmente con el primer proveedor (pokemontcg.io): solo tenía nombres en inglés (`GET /v2/sets?q=name:"Oscuridad Absoluta"` daba 0 resultados) y una coincidencia forzada habría podido sincronizar el set equivocado. El proveedor actual (TCGdex) sí busca directamente en español, pero el diseño de "elegir de una lista" se mantiene igualmente — sigue siendo mejor que dar por buena una única coincidencia sin que el usuario la confirme.
- **El precio viene de Cardmarket vía TCGdex** (`pricing.cardmarket.trend`, con `avg` como resguardo si no hay `trend`), en EUR. Hay que pedirlo carta a carta (`GET /v2/es/cards/:id`): el listado de cartas de un set no trae precio ni rareza, solo id/nombre/imagen. Se piden en paralelo por lotes de 25 (`CARD_FETCH_BATCH_SIZE` en `tcgdexApiProvider.ts`) en vez de todas de golpe, para no bombardear el proveedor con sets de ~250 cartas. Sin conversión de divisa ni fallback a otra fuente: si no hay precio de Cardmarket para una carta, se deja `null` antes que inventar una cifra.
- **`set_checklists`/`set_checklist_cards`** (migraciones `1784000000009`/`1784000000013`) se escriben a través de `SetChecklistRepository.upsertChecklist` (reemplazo completo: borra y reinserta, evita duplicados), llamado desde `POST /set-checklists` (set nuevo) o `POST /set-checklists/:id/resync` (volver a traer un set ya sincronizado, p. ej. para rellenar precio en uno sincronizado antes de que ese campo existiera).
- **`PokemonTcgProvider`** es un puerto intercambiable (mismo patrón que `infrastructure/llm/` en `nous`): `tcgdexApiProvider.ts` es el adaptador real (`fetch` con `AbortSignal.timeout(10000)`), `fakePokemonTcgProvider.ts` es un fixture determinista (un único set fijo "Test Set"/"ts1") para tests/E2E — forzado con `POKEMON_TCG_PROVIDER=fake` en `playwright.config.ts`, nunca contra la red real en CI. El puerto se llama `PokemonTcgProvider` (nombre de la capacidad, no del proveedor) precisamente para que un cambio de proveedor —como este mismo, de pokemontcg.io a TCGdex, a los pocos días de construirlo— sea sustituir un adaptador, no reescribir nada aguas abajo.
- **No hay FK estructural hacia `collection_items` para el emparejamiento de texto.** Como la colección es freeform (nombre del set en cualquier idioma o forma), "qué tengo de este set" se calcula en el frontend (`computeSetChecklistCompletion`, `src/domain/calculations.ts`) comparando por **número de carta** — universal, no depende del idioma — dentro de los ejemplares cuyo `setName` se parece (contención de texto, insensible a mayúsculas/acentos) al nombre del set en inglés o al alias guardado al sincronizar. Ese alias (`set_name_es`) es literalmente el texto que el usuario escribió para encontrar el set, no una traducción — así la siguiente carta del mismo set se sigue relacionando en local aunque se escriba distinto al nombre oficial. La comparación de número también normaliza ceros a la izquierda (`normalizeCardNumber`): pokemontcg.io daba "1", TCGdex da "001" para la misma carta — mismo número, formato de texto distinto, así que compararlos tal cual habría roto el "ya la tienes" para toda la colección guardada antes del cambio de proveedor.
- **Bug real encontrado en producción (2026-07): una carta marcada en un checklist se compartía con otro checklist distinto que la incluyera.** Un binder reúne un Pokémon de cualquier expansión donde haya salido; si esa expansión también está sincronizada como set oficial aparte, la misma carta real (mismo número+variante+expansión) aparece en las dos listas — y como el emparejamiento de arriba compara por texto sobre *toda* la colección sin importar desde qué checklist se marcó, "Marcar como mía" en uno la marcaba automáticamente como tuya en el otro (caso real: Slowbro/Slowpoke de "Oscuridad Absoluta", presentes tanto en el set oficial como en el binder "Slowpoke y Slowbro"). Arreglado añadiendo `collection_items.checklist_id` (migración `1784000000016`, nullable, `ON DELETE SET NULL`): cuando está puesto, `computeSetChecklistCompletion`/`findOwnedCollectionItemIds` exigen que coincida exactamente con el checklist que se está mirando (`belongsToChecklist`), aislando la pertenencia entre checklists. Los ejemplares sin `checklist_id` (altas manuales, o de antes de que existiera el campo) siguen usando el emparejamiento de texto de siempre como *fallback* — no se puede saber a qué checklist "pertenecían" retroactivamente. Cubierto con tests de dominio (`calculations.test.ts`) y un E2E de extremo a extremo que reproduce el caso real con el proveedor fake (dos cartas que comparten número+variante+expansión en un set oficial y un binder).
- **Marcar varias como mías** (`SetCardsGrid` en `SetChecklistTab.tsx`) construye un `NewCollectionItem` por carta seleccionada con valores por defecto (español, Near Mint, x1, sin precio de compra, foto y precio de referencia del checklist) y los crea todos en paralelo (`useCollectionData.addItems`) con un único `reload()` al final, en vez de uno por alta.
- **El id externo no es intercambiable entre proveedores.** pokemontcg.io identificaba "Oscuridad Absoluta" como `me5`; TCGdex usa `me05` (con cero). Al cambiar de proveedor, el checklist que ya estaba sincronizado con el id viejo se borró y se volvió a sincronizar con el id nuevo — si no, el botón "🔄 Actualizar" habría fallado siempre (pidiéndole a TCGdex un id que no existe) y una nueva búsqueda del mismo set lo habría dado de alta duplicado en vez de reconocerlo como "ya lo tienes".

## Reconocimiento de fotos por IA: se probó, se quitó, se recuperó, se quitó otra vez

Hubo una fase intermedia con un flujo "hacer una foto → reconocimiento por IA (Ollama local) → revisión manual" para las tres altas (carta, wishlist, sellado), con un puerto `VisualMatchProvider` y su propio adaptador real/fake. Tras usar la app de verdad, el usuario decidió quitarlo: "complica todo mucho y no aporta nada" frente a elegir directamente del checklist de un set (más preciso, con foto y precio oficiales) o rellenar un formulario corto a mano. Se eliminó por completo en su momento.

Se recuperó el 23/07/2026 con alcance reducido (solo en el alta manual de "Mi colección"), y se amplió en los días siguientes: reconocimiento de variante/idioma además de nombre/expansión/número/rareza, y una vía alternativa para leer una captura de la página de Cardmarket cuando la carta no estaba en el catálogo del proveedor (promos regionales que TCGdex no indexa).

**Se quitó definitivamente el 27/07/2026, al preparar la app para desplegarla en internet.** Motivo: Ollama es una dependencia que corre en local (el Mac del usuario) — en un servidor de despliegue normal no está disponible (instalar y alojar ahí un modelo de visión es caro/pesado para el caso de uso), así que la app habría tenido un comportamiento distinto en local que en producción. El usuario prefirió quitar la IA por completo y que ambos entornos se comporten exactamente igual, antes que mantener una función que solo funcionaría en su máquina. Queda en el alta manual: hacer/adjuntar una foto (solo como imagen guardada, sin analizarla) y un botón "Buscar en el catálogo" que usa lo escrito a mano en Nombre/Expansión/Número contra `GET /card-search` — mismo buscador de antes, ahora con disparo manual en vez de automático tras un reconocimiento. Si esta función se echa en falta en el futuro, la referencia de cómo estaba implementada (prompts, puerto `VisualMatchProvider`, adaptadores Ollama/fake) queda en el historial de git antes de este commit.

## Login de un solo usuario (sin tabla `users`)

A diferencia del resto del brief original (que planteaba un producto abierto a otros coleccionistas), la app es **single-tenant** — sigue sin tabla `users`, sin `user_id` en ninguna tabla. Decisión explícita del usuario al revisar el plan inicial ("por ahora solo la voy a usar yo").

**Login real añadido el 27/07/2026** (antes había solo un token bearer fijo opcional, sin pantalla propia — mismo patrón que rumbo/nous/faro; se sustituyó al desplegar en internet porque el usuario quería que nadie más pudiera entrar, no solo que la API exigiera un secreto). Usuario + contraseña configurados por variables de entorno (`LOGIN_USERNAME`/`LOGIN_PASSWORD_HASH`/`SESSION_SECRET`, ver backend/.env.example) — no hay tabla `users` porque hay exactamente un usuario, así que no hace falta una. Sigue siendo opcional: sin esas tres variables, la app no pide login (uso personal local sin fricción, mismo criterio que el token fijo que sustituye).

- **Contraseña con `scrypt`** (nativo de Node, sin añadir bcrypt/argon2 — ver `passwordHash.ts`), nunca en claro. `npm run hash-password -- "contraseña"` genera el valor de `LOGIN_PASSWORD_HASH`.
- **Sesión con un token firmado (HMAC-SHA256) sin estado en el servidor** (`sessionToken.ts`) — nada que guardar en base de datos ni que se pierda si se reinicia el proceso; el propio token lleva su caducidad (30 días) firmada. Cerrar sesión desde la app solo borra el token del propio dispositivo (`localStorage`), no lo revoca en el servidor — con 30 días de vida y un único usuario real, no ha compensado la complejidad de una lista de revocación.
- **`GET /auth-config`** (siempre público) le dice al frontend si hace falta login antes de intentar nada — así el frontend no dispara peticiones autenticadas a ciegas: los 5 hooks de datos (`useCollectionData`, etc.) reciben un flag `enabled` y no llaman a nada hasta saber que no hace falta login, o que ya hay sesión.
- **`POST /login`** verifica usuario+contraseña y devuelve el token; `/health`, `/login` y `/auth-config` son las únicas rutas públicas cuando el login está activo.
- **`/login` tiene su propio límite de peticiones** (10/minuto), aparte del límite general de la API (300/minuto, pensado para uso normal de CRUD) — es la única ruta que un atacante externo puede probar sin sesión, así que merece frenar la fuerza bruta por separado.

Al hacer público el repo (28/07/2026) se revisó con más detalle de cara a portfolio y se corrigió lo siguiente:

- **Manejador de errores global** (`server.ts`): cualquier error no controlado (p. ej. un id que no es un UUID válido, que antes hacía que Postgres lanzara su propio mensaje de error hasta el cliente tal cual) ahora responde con un mensaje genérico en 500 y registra el error completo solo en el logger del servidor — antes de esto, un error real podía filtrar detalle interno (nombre de columna, mensaje del driver) en una API ya expuesta a internet.
- **`findById` en los repositorios** (`domain/ports.ts`): varios casos de uso (`overrideEstimatedValue` en colección/sellado, `toggleDone` del plan, `moveToCollection` de wishlist, y tres sitios de `setChecklists.ts`) traían la lista entera con `repo.list()` para buscar un solo elemento con `.find()`. Se añadió `findById` (y `findByExternalId` en `SetChecklistRepository`) al puerto y se implementó en cada repositorio Postgres — elimina la duplicación y evita traer todas las filas para operar sobre una sola.

Si algún día se abre a otros usuarios, la migración queda documentada (no construida): añadir `users`+`sessions` reales, añadir `user_id` a `collection_items`/`wishlist_items`/`sealed_purchases` (nullable primero, backfill a un único usuario, luego `not null`), `collections` con visibilidad (`private`/`unlisted`/`public`).

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
- `name:*Black Bolt*` (comodín sin comillas, en pokemontcg.io) daba 400 en cuanto el nombre del set tenía más de una palabra — no era la inestabilidad ya conocida de esa API, era un fallo de sintaxis constante, encontrado reintentando en vivo hasta poder distinguir un 400 sistemático de un 500 aleatorio.
- Al comparar en vivo pokemontcg.io con TCGdex antes de cambiar de proveedor (84 peticiones en paralelo, 84/84 correctas, frente al ~45% de error habitual del anterior) se encontró que TCGdex devuelve el número de carta con ceros a la izquierda ("001") mientras el proveedor anterior no ("1") — mismo número, comparación de texto exacta rota; se corrigió antes de que llegara a producción normalizando ambos lados (`normalizeCardNumber`) en vez de descubrirlo por un usuario viendo que una carta que ya tenía aparecía como que le faltaba.

## Estructura del repositorio

- `src/domain/` — tipos y cálculos puros (`formatMoney`, `groupWishlistByMonth`, `groupPlanByMonth`, `computeSetChecklistCompletion`).
- `src/data/` — un hook por área (`useCollectionData`, `useWishlistData`, `useSealedData`, `usePlanData`, `useSetChecklistData`) + `api.ts` + `imageCapture.ts` (compresión de fotos en cliente, usada por el adjuntar-foto-a-mano de `PhotoField`).
- `src/features/` — una pantalla por carpeta: `coleccion/` (incluye `SetChecklistTab.tsx`, el alta manual de carta, y `ItemCard.tsx`/`SealedItemCard.tsx` como componentes propios — antes vivían dentro de `ColeccionScreen.tsx`, que llegó a 648 líneas mezclando demasiadas responsabilidades; se separaron el 28/07/2026 al revisar el repo de cara a portfolio), `wishlist/`, `sellado/`, `dashboard/`, `plan/`.
- `backend/src/domain|application|infrastructure/` — ver arquitectura hexagonal arriba.
- `docker-compose.yml` — Postgres local, puerto 5436.

## Roadmap (no construido todavía, documentado a propósito)

- **Fase 2 — Progreso y organización**: vista grid/lista con agrupar/ordenar/filtrar avanzado, estadísticas (carta más valiosa, distribución por rareza/idioma). Solo lecturas nuevas sobre datos que ya existen.
- **Fase 3 — Dinero histórico**: `collection_value_snapshots` para la evolución del valor en el tiempo, transacciones de compra/venta/intercambio con terceros (comisiones, envío, beneficio neto), presupuesto mensual vs gasto real (complementa el plan, que es planificación *antes* de comprar, con seguimiento de lo *ya* gastado).
- **Fase 4 — Multi-usuario real**: el día que se decida abrir a otros coleccionistas (ver sección de auth arriba).
- **Fase 5 — Ampliar la búsqueda de sets**: una tabla de alias ES/EN curada a mano (no adivinada) para que la búsqueda encuentre sets aunque se escriban en español, actualización automática periódica de precio de los sets ya sincronizados (hoy es manual, botón "🔄 Actualizar").
