# Arquitectura y decisiones técnicas

Este documento explica cómo está construido PokéVault y por qué — para el manual de uso día a día, ver el [README](README.md).

## Visión general

PokéVault es un gestor de colecciones Pokémon TCG: qué cartas y qué producto sellado posees, cuánto pagaste, cuánto valen ahora, y qué quieres conseguir a continuación. Nace de un brief mucho más ambicioso (multi-usuario, escáner de cartas, logros, compras/ventas con terceros...) que se recortó deliberadamente a lo que el propio usuario marcó como mínimo indispensable tras revisar el plan inicial: registrar lo que tienes (carta suelta o sellado), de dónde salió (compra directa o de un sobre), tu wishlist organizada por colección/tipo, y un objetivo de compra mensual.

```
Frontend (React + TS)  ──HTTP/JSON──▶  Backend (Fastify + TS)  ──SQL──▶  PostgreSQL
     dominio puro                        hexagonal                      (Docker)
                                              │
                                              └──▶ pokemontcg.io (solo desde el script de sincronización)
```

## Stack y por qué

| Capa | Elección | Motivo |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | Mismo criterio que rumbo/nous/faro: rápido de iterar, tipado de extremo a extremo |
| Estilos | Tailwind v4 + variables CSS | Paleta propia ("vitrina de coleccionista": casi negro + rojo Poké Ball + dorado), distinta del resto del portfolio |
| Backend | Node + TypeScript + Fastify | Overhead mínimo, mismo patrón que los tres hermanos |
| Base de datos | PostgreSQL en Docker (local) | Herramienta personal, sin despliegue público |
| Migraciones | `node-pg-migrate` | Versionadas en TypeScript |
| Sin ORM | Repositorio con `pg` + SQL explícito | Volumen pequeño, un solo usuario; un ORM no aporta nada aquí |
| Catálogo | [pokemontcg.io](https://pokemontcg.io) (API pública) | Gratis, bien documentada — con matices, ver más abajo |

## Arquitectura hexagonal (backend)

```
backend/src/
  domain/           tipos + puertos (CatalogProvider, repositorios) — cero dependencias externas
  application/      casos de uso: validación de negocio + orquestación
  infrastructure/
    db/             pool de conexión, migraciones, repositorios Postgres
    catalog/        proveedor de catálogo (real + fake) + script de sincronización
    http/           servidor Fastify, rutas HTTP
```

`domain/ports.ts` define las interfaces de repositorio y de `CatalogProvider`, más una función pura (`resolveItemEstimatedValue`) sin ninguna dependencia externa — se puede testear sin BD ni red.

## El catálogo se cachea localmente: por qué, y el riesgo de proveedor

`pokemontcg.io` sigue funcionando y es gratis, pero el propio equipo ha movido el foco a **Scrydex**, una versión de pago con más TCGs y mejor histórico de precios — mismo patrón de riesgo que ya se vivió en `faro` con Google Custom Search y Bing Search API (ambas retiradas del todo). Por eso:

1. **El catálogo se sincroniza a una caché local** (`catalog_sets`/`catalog_cards`) en vez de consultarse en caliente. La búsqueda del usuario necesita filtros combinados y no puede depender de la disponibilidad ni del rate limit de una API de terceros en cada tecleo.
2. **`CatalogProvider` es un puerto intercambiable desde el primer commit** (mismo patrón que `infrastructure/llm/` en `nous`, con proveedores de IA intercambiables): `pokemonTcgApiProvider.ts` es el adaptador real (fetch crudo, sin SDK), `fakeCatalogProvider.ts` es un fixture determinista para tests/E2E. Si `pokemontcg.io` se degrada algún día, migrar a Scrydex (u otro proveedor) es sustituir un fichero, no reescribir nada aguas abajo.
3. **El proveedor externo nunca se llama en una petición de usuario** — solo lo consume `infrastructure/catalog/syncCatalog.ts` (`npm run sync:catalog`), un script manual (no programado todavía) que hace upsert en la caché local y registra cada pasada en `catalog_sync_log` (de dónde viene el precio y cuándo se actualizó por última vez — regla de negocio explícita: nunca mostrar un precio sin decir su fecha y fuente).
4. **La API solo da el precio *actual*, nunca histórico.** Cuando haga falta la evolución del valor en el tiempo (Fase 3 del roadmap), se construirá con snapshots propios — mismo patrón exacto que `Snapshot` en `rumbo` para el histórico de patrimonio — no dependiendo de un histórico de terceros que no existe en el free tier.

De los dos precios que da la API (`tcgplayer` en USD, `cardmarket` en EUR), el adaptador prioriza `cardmarket` por la base de usuarios europea, etiquetando siempre la moneda explícitamente — nadie aguas abajo asume EUR por defecto.

## Sin autenticación multi-usuario (todavía)

A diferencia del resto del brief original (que planteaba un producto abierto a otros coleccionistas), la Fase 1 es **single-tenant**, exactamente igual que rumbo/nous/faro: mismo `registerAuth(app, token)` con un token bearer fijo opcional, sin tabla `users`, sin `user_id` en ninguna tabla. Decisión explícita del usuario al revisar el plan inicial ("por ahora solo la voy a usar yo").

Si algún día se abre a otros usuarios, la migración queda documentada (no construida): añadir `users`+`sessions`, añadir `user_id` a `collection_items`/`wishlist_items`/`sealed_purchases` (nullable primero, backfill a un único usuario, luego `not null`), `collections` con visibilidad (`private`/`unlisted`/`public`), y login vía Google OAuth con sesión en base de datos (cookie con token opaco, no JWT — para poder revocar una sesión al momento sin mantener una denylist aparte).

## Reglas de negocio del dinero

- **Cada alta en la colección es una fila nueva.** El caso de uso `create` de `collectionItems`/`sealedPurchases` nunca actualiza el `purchasePrice` de una fila existente — así nunca se pisa un precio de compra histórico.
- **"Vino de un sobre" no inventa un precio.** `acquisitionType='pulled_from_pack'` deja `purchasePrice` en `null` en vez de rellenarlo con 0 — no se sabe cuánto costó *esa carta en concreto* dentro de un sobre de varias, y mentir con un 0 sería peor que no saberlo. Opcionalmente se vincula (`sealedPurchaseId`) a la compra del sobre del que salió, sin prorratear el coste automáticamente.
- **Corrección manual del valor, siempre identificada como tal.** `estimatedValueOverride` + `estimatedValueOverrideAt` + `estimatedValueOverrideNote` en vez de sobrescribir silenciosamente `currentPrice` — la corrección del usuario gana sobre el precio de catálogo (`resolveItemEstimatedValue`), pero queda trazada.
- **Sin valor conocido no es lo mismo que valor cero.** `CollectionSummary.itemsWithoutValue` cuenta aparte los ejemplares sin `currentPrice` ni corrección manual — el dashboard avisa de ellos en vez de sumarlos como 0€ sin decir nada.
- **Cartas graduadas son ejemplares propios.** No se fusionan con una copia no graduada de la misma carta de catálogo — cada fila de `collection_items` es un objeto físico distinto.

## Bug real encontrado: columnas `date` de Postgres

Las primeras migraciones usaban `date` para `release_date`/`purchase_date`. Al leer una fila de vuelta con `pg` y pasarla por `new Date(...).toISOString()`, el valor se desplazaba un día según la zona horaria del proceso (España, UTC+1/+2) — una compra registrada el 1 de julio volvía como 30 de junio. Detectado probando el flujo completo con datos reales (ver `server.test.ts`, test de regresión explícito). Se corrigió cambiando esas columnas a `text` (formato `"YYYY-MM-DD"`, sin pasar por el parser de fechas de `pg` ni por `Date` de JS en ningún punto) — mismo criterio ya documentado como gotcha conocido en esta familia de proyectos.

## Objetivo de compra mensual sin tabla nueva

`wishlist_items.target_month` (`"YYYY-MM"`, nullable) es toda la funcionalidad: la pantalla "Wishlist" agrupa por ese campo (`groupWishlistByMonth`, `src/domain/calculations.ts`) para dar directamente "en agosto quiero esto, en septiembre esto otro", reutilizando prioridad y precio máximo que ya existían. No hace falta una entidad de planificación aparte.

## Rigor de pruebas: bugs reales encontrados, no solo cobertura

- El bug de fechas de arriba, con test de regresión en `server.test.ts` que compara la fecha exacta enviada contra la devuelta.
- Al escribir el E2E, se encontró que el modal de detalle de carta no se cerraba al añadir a la wishlist (bloqueaba la navegación con el modal encima) — corregido en `BuscarScreen.tsx`, no solo en el test.
- El encabezado del nombre de la carta aparecía duplicado (título del modal + un `<h2>` propio dentro de `CardDetail`) — detectado por un test de accesibilidad (`getByRole("heading")` encontraba dos elementos), corregido quitando el duplicado real, no ajustando el test para tolerarlo.

## Estructura del repositorio

- `src/domain/` — tipos y cálculos puros (`formatMoney`, `groupWishlistByMonth`).
- `src/data/` — un hook por área (`useCatalogData`, `useCollectionData`, `useWishlistData`, `useSealedData`) + `api.ts`.
- `src/features/` — una pantalla por carpeta: `buscar/`, `coleccion/`, `wishlist/`, `sellado/`, `dashboard/`.
- `backend/src/domain|application|infrastructure/` — ver arquitectura hexagonal arriba.
- `docker-compose.yml` — Postgres local, puerto 5436.

## Roadmap (no construido todavía, documentado a propósito)

- **Fase 2 — Progreso y organización**: progreso por expansión (grid con estados no-obtenida/wishlist/obtenida/duplicada/graduada), vista grid/lista con agrupar/ordenar/filtrar avanzado, estadísticas (carta/expansión más valiosa, distribución por rareza/artista/idioma). Solo lecturas nuevas sobre datos que ya existen.
- **Fase 3 — Dinero histórico**: `price_snapshots`/`collection_value_snapshots` para la evolución del valor en el tiempo, transacciones de compra/venta/intercambio con terceros (comisiones, envío, beneficio neto), presupuesto mensual vs gasto real.
- **Fase 4 — Multi-usuario real**: el día que se decida abrir a otros coleccionistas (ver sección de auth arriba).
- **Fase 5 — Reconocimiento y logros**: escáner de cartas modelado como puerto `VisualMatchProvider` (captura→recorte→confirmación manual siempre, nunca alta automática) con un fake que cablea el flujo UX completo antes de tener motor de visión real; logros discretos sobre datos que ya existen.
- **Fase 6 — Escala**: adaptador real de OCR/visión, virtualización de listas, code-splitting por ruta, imágenes WebP/AVIF vía CDN — al final, para no optimizar contra una base de usuarios que aún no existe.
