# PokéVault

Gestor personal de colecciones de cartas Pokémon TCG: cartas sueltas, producto sellado, wishlist con objetivo de compra mensual, y valor total estimado de todo lo que tienes.

Es una herramienta de uso personal (como sus hermanos [rumbo](../rumbo), [nous](../nous) y [faro](../faro)) construida con calidad de producto real: base de datos real, arquitectura hexagonal, tests de verdad. Multi-usuario real (login, colecciones compartidas) queda para más adelante — ver [ARCHITECTURE.md](ARCHITECTURE.md).

## Configuración inicial (solo la primera vez)

```bash
# 1. Variables de entorno
cp .env.example .env
cp backend/.env.example backend/.env
# Edita ambos .env y pon tu propia contraseña de Postgres (debe coincidir en los dos
# archivos, tanto en POSTGRES_PASSWORD como dentro de DATABASE_URL).

# 2. Base de datos
docker compose up -d

# 3. Backend
cd backend
npm install
npm run migrate:up
cd ..

# 4. Frontend
npm install
```

`npm run migrate:up` deja el esquema listo, pero **la tabla de cartas está vacía hasta que sincronices el catálogo**:

```bash
cd backend
npm run sync:catalog
```

Tarda varios minutos la primera vez (recorre todos los sets y cartas de [pokemontcg.io](https://pokemontcg.io)). Sin `POKEMON_TCG_API_KEY` en `backend/.env` sigue funcionando, solo con menos margen de peticiones por minuto — consigue una gratis en [dev.pokemontcg.io](https://dev.pokemontcg.io) si vas a repetir la sincronización a menudo.

## Arrancar en el día a día

```bash
# 1. Base de datos
docker compose up -d

# 2. Backend (puerto 3004)
cd backend && npm run dev

# 3. Frontend (puerto 5186, desde la raíz del proyecto)
npm run dev
```

O directamente `../start-project.sh pokevault` desde `~/AI/proyectos`, que levanta los tres servicios de una vez.

Conviene volver a correr `npm run sync:catalog` de vez en cuando (semanal, por ejemplo) para refrescar precios y nuevos sets — no hay job automático todavía, es manual a propósito hasta que se use lo suficiente para justificar programarlo.

## Tests

```bash
# Backend
cd backend && npm test

# Frontend
npm test

# E2E (Playwright, contra una base de datos de test aparte — nunca la real)
npm run test:e2e
```

## Qué hace la Fase 1 (la que ya está construida)

- **Buscar**: busca en el catálogo sincronizado por nombre, filtra por expansión, y desde el detalle de una carta la añades a tu colección (idioma, estado de conservación, cantidad, precio de compra, si es graduada) o a tu wishlist.
- **Mi colección**: todos tus ejemplares, con su valor de mercado actual (o una corrección manual tuya, si prefieres tu propia estimación) y la diferencia frente a lo que pagaste.
- **Producto sellado**: sobres, cajas, ETBs — registro de compra con ubicación física, sin depender de un precio de mercado automático (no existe para sellado) porque se estima a mano.
- **Wishlist**: prioridad, precio máximo, y un **mes objetivo de compra** ("en agosto esto, en septiembre esto otro") — agrupa la propia wishlist por mes, sin necesitar una pantalla aparte. "Ya la tengo" mueve el deseo a tu colección registrando la compra real.
- **Resumen**: valor total (cartas + sellado), lo invertido, ganancia o pérdida estimada — y un aviso aparte para lo que no tiene valor de mercado conocido todavía (nunca se cuenta como 0€ en silencio).

## Estructura

- `src/` — frontend (React + Vite + Tailwind).
- `backend/src/domain|application|infrastructure/` — hexagonal: dominio puro, casos de uso, adaptadores (Postgres, catálogo).
- `backend/src/infrastructure/catalog/` — `pokemonTcgApiProvider.ts` (real) + `fakeCatalogProvider.ts` (tests/E2E) + `syncCatalog.ts` (script que puebla la caché local).
- `e2e/` — Playwright, contra el catálogo fake sembrado en `global-setup.ts`.

Más detalle de las decisiones técnicas (por qué se cachea el catálogo, por qué no hay auth todavía, el riesgo del proveedor de datos) en [ARCHITECTURE.md](ARCHITECTURE.md).

## Privacidad

Herramienta de uso personal: no hay despliegue público. Los datos viven en tu propia base de datos local (Docker), igual que rumbo/nous/faro.
