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

## Avisar de duplicados y asignar a set/binder al dar de alta una carta suelta (2026-07-29)

Pedido explícito del usuario: al hacer una foto/buscar una carta en el alta manual, quería saber si ya la tenía y, si no, poder asignarla a un set/binder — aclarado explícitamente que se refería al flujo actual (foto + "Buscar en el catálogo"), no a recuperar el reconocimiento por IA (ver sección de arriba, quitado a propósito por incompatibilidad local/producción).

- **`findMatchingCollectionItems`** (`src/domain/calculations.ts`): busca en TODA la colección (a diferencia de `computeSetChecklistCompletion`, que solo mira dentro de un checklist) ejemplares con el mismo número+variante y expansión parecida — avisa "ya tienes N" sin bloquear el alta (puede ser una segunda copia real).
- **`findChecklistsContainingCard`**: de los checklists ya sincronizados, cuáles contienen de verdad esta carta exacta — solo esos se ofrecen para asignar, así no se distorsiona el % completado de un checklist que en realidad no la tiene.
- Ambos se activan solo tras aplicar una coincidencia real del catálogo (`appliedMatch`), nunca con texto libre a medio escribir — a partir de ahí expansión/número/variante son datos oficiales del proveedor, no una suposición.
- **Bug real encontrado de paso, no relacionado con lo pedido**: `SetSearchPanel.handleSync` guardaba como `setNameEs` el texto que el usuario había escrito para buscar el set, no el nombre oficial que devolvía el proveedor (`candidate.name`) — con TCGdex (endpoint `/v2/es/`, ya en español) ese nombre ya es el correcto, así que guardar el texto buscado solo introducía mayúsculas/acentos/parciales incorrectos. El comentario que lo explicaba (`SetSearchPanel`) seguía describiendo la razón de la época de pokemontcg.io (proveedor solo en inglés), ya obsoleta desde el cambio de proveedor. Corregido para guardar `candidate.name` directamente.

## Sin feedback visual al hacer una foto en el alta manual (bug real, 2026-07-29)

El usuario reportó "le doy a foto y cuando la hago no hace nada". La captura en sí funcionaba de verdad (comprobado con logs: `handleChange` se disparaba, `compressImage` resolvía, `onCapture` se llamaba) — el problema era puramente de feedback: justo donde está el botón de la cámara (`PhotoCapture.tsx`), al terminar de procesar la foto volvía a mostrarse el mismo botón y el mismo texto de partida, sin ningún cambio visible ahí. El único aviso de que la foto se había guardado era un mensaje de texto aparte, bastante más abajo en `CollectionQuickForm.tsx` (después de varios campos y del botón "Buscar en el catálogo") — fácil de no ver, sobre todo en móvil.

Arreglado pasando la foto ya capturada (`capturedPhoto`) como prop `value` a `PhotoCapture`, que ahora la muestra como miniatura justo en el sitio del botón, con "✓ Foto guardada — cambiar" en vez del texto de partida. Feedback inmediato en el punto de la interacción, no solo un mensaje aparte más abajo.

## Multi-usuario real: `users` + login obligatorio (2026-07-29)

**La app dejó de ser single-tenant.** El plan de negocio (`~/AI/documentos/pokevault-saas-plan.md`) es ofrecerla como SaaS de pago; este es el primer incremento del MVP: cuentas reales y aislamiento de datos por usuario, migrando la colección real del dueño para que sea el primer usuario. Fuera de este incremento a propósito: Stripe/facturación, cupos de reconocimiento por IA, alta pública (autoregistro) — ver el plan de negocio para el resto de fases.

- **`users`** (`id`/`email` único/`password_hash`) + `user_id` (`NOT NULL`, `ON DELETE CASCADE`) en `sealed_purchases`, `collection_items`, `wishlist_items`, `plan_items`, `plan_settings`, `set_checklists`. Migrado en dos pasos (`1784000000017` nullable + `1784000000018` `NOT NULL`/constraints), con un script puntual intermedio (`backfillOwnerUser.ts`, no una migración) que crea la cuenta del dueño reutilizando su `LOGIN_USERNAME`/`LOGIN_PASSWORD_HASH` de siempre (mismo hash, la contraseña real no cambia) y le asigna todas las filas existentes — nunca se comitea un hash real a git.
- **`set_checklists`** pasó primero de `UNIQUE(external_set_id)` a `UNIQUE(user_id, external_set_id)` — cada usuario lo sincronizaba de forma independiente, con su propia copia completa de las cartas. Esto se revisó el mismo día (ver sección siguiente): con más de un usuario real, sincronizar el mismo set duplicaba almacenamiento y llamadas al proveedor una vez por usuario — se separó en catálogo compartido + puntero ligero por usuario.
- **`plan_settings`** deja de ser un singleton global (una fila para toda la instancia, sembrada por migración) — pasa a ser una fila por usuario, creada la primera vez que se pide (`INSERT ... ON CONFLICT (user_id)`).
- **Cada repositorio se construye acotado a un `userId`** (p. ej. `createCollectionItemRepository(pool, userId)`) en vez de recibirlo en cada método — cada consulta SQL interna filtra siempre por `user_id`, incluidos `findById`/`update`/`remove` (nunca solo por `id`, o cualquier usuario podría leer/editar/borrar filas de otro adivinando su UUID). Las funciones de caso de uso (`application/*.ts`) no cambian de firma en absoluto: ya reciben un repositorio, y ahora ese repositorio ya viene acotado, igual que siempre recibían `pool` cerrado sobre sí mismo. Como consecuencia, cada función de registro de rutas construye el repo+casos de uso **por request** (`request.userId`, decorado tras verificar el token), no una vez al arrancar el servidor.
- **Login pasa a ser obligatorio siempre** (antes era opcional sin las tres variables de entorno — con datos por usuario, "sin login" deja de tener sentido). El token de sesión (HMAC-SHA256, sin estado en el servidor, `sessionToken.ts`) lleva ahora el id del usuario dentro del payload firmado, no solo una fecha de caducidad. `LOGIN_USERNAME`/`LOGIN_PASSWORD_HASH` ya no los lee el servidor — solo los usa `npm run backfill-owner-user` una vez.
- **Sin alta pública todavía**: la única forma de crear una cuenta es ese script puntual — el autoregistro llega en un incremento posterior, junto con Stripe (para no abrir cuentas sin control de pago/cupos).
- **Repo puesto en privado el mismo día** en GitHub (antes público como pieza de portfolio) — al pasar a ser un producto de pago, no tiene sentido que el código fuente sea descargable por cualquiera. Alternativas de portfolio decididas: demo en vivo con datos ficticios (`npm run seed:demo`) + case study en el portfolio propio, en vez de código público.

Contraseña con `scrypt` (nativo de Node, `passwordHash.ts`) sin cambios; `npm run hash-password -- "contraseña"` sigue generando el hash. `GET /auth-config` sigue existiendo (siempre devuelve `loginRequired: true` ahora) para no tener que tocar el flujo del frontend que ya lo usaba. `/login` sigue con su propio límite de peticiones (10/minuto) aparte del general de la API.

## Catálogo compartido de sets/binders, separado del checklist por usuario (2026-07-29)

Segundo incremento del pivote a SaaS, mismo día que el anterior: con `set_checklists` acotado por `user_id`, si dos usuarios sincronizaban el MISMO set/binder real (p. ej. "Oscuridad Absoluta"), cada uno se llevaba su propia copia completa e independiente de las cartas, descargada del proveedor por separado — desperdiciaba almacenamiento y, sobre todo, llamadas reales a TCGdex que deberían pasar una sola vez por set/binder real, no una vez por usuario.

- **`set_catalogs`/`set_catalog_cards`** (nuevas, compartidas): un catálogo por `external_set_id` real (id de TCGdex o el string determinista `binder:...`), para TODA la instancia — nombre, cartas, precios, imágenes, `synced_at` (frescura de los datos, compartida). `set_checklists` se queda ligero: solo `id` (sin cambiar de valor para las filas existentes — `collection_items.checklist_id` depende de eso), `user_id`, `catalog_id` y `set_name_es` (alias propio del usuario — en sets oficiales el nombre en español que ya da el proveedor, en binders su título personal, nunca compartido). `synced_at` se renombra a `created_at` en `set_checklists` (pasa a significar "cuándo lo añadí yo").
- El `SetChecklist` compuesto que ve el resto de la app (frontend incluido) **no cambia de forma** — sigue teniendo `externalSetId`/`setName`/`totalCards`/`kind`/`pokemonNames`/`syncedAt`, solo que ahora vienen de un `JOIN` a `set_catalogs` en vez de estar guardados en la fila del usuario. Cero cambios en frontend (`SetChecklistTab.tsx`, `calculations.ts`).
- **`sync`/`createBinder`** (`application/setChecklists.ts`) ganan un paso intermedio: si YO ya lo tengo, no repite el trabajo (igual que antes); si no lo tengo pero YA existe un catálogo (lo sincronizó otro usuario), solo añade mi puntero — **sin llamar al proveedor**, el ahorro real que motiva la separación; solo si no existe ningún catálogo se llama a TCGdex y se crea uno nuevo. Verificado en real: dos usuarios sincronizando el mismo set (99 cartas reales) — el segundo tardó ~20ms (vs. varios segundos del primero) y ambos quedaron apuntando al mismo `catalog_id`, con 147 filas de carta (no 294) en `set_catalog_cards`.
- **`resync`** pasa a refrescar el catálogo COMPARTIDO (verificando antes que el checklist es del usuario que pulsa "Actualizar") — beneficia a todos los que lo tengan añadido, no solo a quien lo pulsa. El cron `refreshChecklistPrices.ts` pasa de iterar usuarios→sus checklists a iterar `set_catalogs` directamente: una sola llamada al proveedor por set/binder real, sea cual sea el número de usuarios que lo tengan.
- Migración en un solo paso (`1784000000019`, sin el baile de 3 pasos de `users`: aquí no hay secretos externos, todo es SQL sobre datos ya presentes) — deduplica por `external_set_id` con `DISTINCT ON (... ORDER BY synced_at DESC)` por si alguna vez hubiera duplicados (no los había: producción tenía 2 filas de 1 usuario, `external_set_id` distintos). Verificada con un escenario simulado de 2 usuarios con el mismo `external_set_id` antes de desplegar: ambas filas de `set_checklists` (con sus ids originales intactos) quedaron apuntando al mismo catálogo nuevo, con los datos del checklist sincronizado más recientemente.
- **Aceptado sin resolver, bajo riesgo con el volumen de usuarios reales de hoy**: una condición de carrera si dos usuarios sincronizan el MISMO set nuevo (sin catálogo previo) en el mismo instante (el segundo insert chocaría contra el `UNIQUE(external_set_id)` de `set_catalogs`, un 500 sin capturar) — no bloqueante para este incremento.

Al hacer público el repo (28/07/2026, antes de este incremento) se revisó con más detalle de cara a portfolio y se corrigió lo siguiente:

- **Manejador de errores global** (`server.ts`): cualquier error no controlado (p. ej. un id que no es un UUID válido, que antes hacía que Postgres lanzara su propio mensaje de error hasta el cliente tal cual) ahora responde con un mensaje genérico en 500 y registra el error completo solo en el logger del servidor — antes de esto, un error real podía filtrar detalle interno (nombre de columna, mensaje del driver) en una API ya expuesta a internet.
- **`findById` en los repositorios** (`domain/ports.ts`): varios casos de uso (`overrideEstimatedValue` en colección/sellado, `toggleDone` del plan, `moveToCollection` de wishlist, y tres sitios de `setChecklists.ts`) traían la lista entera con `repo.list()` para buscar un solo elemento con `.find()`. Se añadió `findById` (y `findByExternalId` en `SetChecklistRepository`) al puerto y se implementó en cada repositorio Postgres — elimina la duplicación y evita traer todas las filas para operar sobre una sola.

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

## Roadmap

- ~~**Fase 2 — Progreso y organización**~~: hecho el 2026-07-28 — ver "Estadísticas y resumen de sets/binders" y "Ordenar/agrupar la colección" más abajo.
- **Fase 3 — Dinero histórico** (pendiente, descartada por ahora a petición explícita del usuario): `collection_value_snapshots` para la evolución del valor en el tiempo, transacciones de compra/venta/intercambio con terceros (comisiones, envío, beneficio neto), presupuesto mensual vs gasto real (complementa el plan, que es planificación *antes* de comprar, con seguimiento de lo *ya* gastado).
- ~~**Fase 4 — Multi-usuario real**~~: hecho el 2026-07-29 — cuentas reales + login obligatorio + catálogo de sets/binders compartido entre usuarios (ver "Multi-usuario real" y "Catálogo compartido" más arriba). Pendiente aún dentro del mismo pivote a SaaS (ver `~/AI/documentos/pokevault-saas-plan.md`): Stripe/facturación, cupos de reconocimiento por IA, alta pública.
- ~~**Fase 5 — Ampliar la búsqueda de sets**~~: revisada el 2026-07-28 — la tabla de alias ES/EN ya no hace falta (ver más abajo, TCGdex ya busca en español); la actualización automática de precio sí se construyó, ver "Actualización automática de precio".

## Estadísticas y resumen de sets/binders (2026-07-28)

Pedido explícito del usuario tras preguntar "¿algo más que podamos añadir?" — cierra la Fase 2 del roadmap.

- **`mostValuableItem`/`collectionRarityDistribution`/`collectionLanguageDistribution`** (`src/domain/calculations.ts`): funciones puras sobre `CollectionItem[]` ya cargado, sin ninguna consulta nueva al backend — todo dato para esto ya existía en el cliente. La distribución cuenta por `quantity` (cuántas cartas físicas), no por fila, mismo criterio que el resto de agregados de la app.
- **`summarizeChecklistCompletion`**: reutiliza `computeSetChecklistCompletion` (por eso hereda gratis el aislamiento entre checklists de la corrección de "cartas compartidas") para dar, por cada set/binder sincronizado, el % completado y cuánto costaría (suma de `referencePrice` de las que faltan, con precio conocido) terminarlo. Vive en `SetsSummaryCard` dentro de "Resumen", ordenado por % de completitud descendente — responde "¿en cuál merece más la pena centrarme ahora?".
- Ninguna de las dos tarjetas nuevas (`CollectionStatsCard`, `SetsSummaryCard`) llama a nada por su cuenta: reciben los mismos `items`/`checklists`/`cardsByChecklist` que ya cargaba `App.tsx` para el resto de pantallas.

## Ordenar la colección (2026-07-28, agrupación quitada 2026-07-28)

`sortCollectionItems` (`src/domain/calculations.ts`) sobre la pestaña "Cartas" de "Mi colección" (nombre, valor estimado, fecha de compra). También se construyó una opción de agrupar (por expansión/rareza), pero el usuario la probó y pidió quitarla el mismo día — se eliminó `groupCollectionItems`/`CollectionGroupKey` por completo en vez de dejarla oculta o sin usar.

## La tabla de alias ES/EN de sets ya no hace falta (revisado 2026-07-28)

Estaba en el roadmap desde que el proveedor era pokemontcg.io (solo nombres en inglés). Comprobado en vivo contra la API real de TCGdex: `GET /v2/es/sets?name=absoluta` encuentra "Oscuridad Absoluta" sin traducir nada — el proveedor actual ya resuelve el problema que esa tabla iba a resolver. No se construye nada.

## Actualización automática de precio (2026-07-28)

Antes solo existía el botón manual "🔄 Actualizar" por checklist — la app tiene una regla de diseño explícita de no llamar nunca a TCGdex en segundo plano, solo en acciones directas del usuario (ver "Checklist de set" más arriba). El usuario pidió automatizarlo de verdad, **exceptuando esa regla a propósito** para este caso concreto:

- **`backend/src/scripts/refreshChecklistPrices.ts`** — script de servidor (mismo patrón que `seedDemoData.ts`/`hashPassword.ts`, `npm run refresh-checklist-prices`), no un endpoint HTTP: llama a `resync()` (el mismo caso de uso que ya usa el botón manual) para cada checklist ya sincronizado, con una pausa de 1s entre cada uno para no bombardear TCGdex de golpe. Se ejecuta con acceso directo al pool, así que no hace falta autenticarse contra la propia API ni guardar ninguna contraseña en el cron.
- **Cron en el VPS** (`~/backups/refresh-pokevault-prices.sh`, mismo patrón que el backup de base de datos): semanal, domingos a las 05:00 — después de los backups diarios (04:15/04:20), y con periodicidad baja a propósito, ya que el precio de una colección personal no cambia lo bastante rápido como para justificar algo más frecuente.
- Probado en real antes de desplegarlo: un checklist de prueba con un precio "envejecido" a mano (999,99 €) pasó a mostrar el precio real de Cardmarket (0,04 €) tras ejecutar el script, confirmando que llama a TCGdex de verdad y no solo simula el refresco.
