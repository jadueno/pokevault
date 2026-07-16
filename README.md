# PokéVault

Gestor personal de colecciones de cartas Pokémon TCG: haces una foto a lo que compras (carta o caja), se identifica con IA local, y queda registrado con precio de compra, valor estimado y plan de compra mensual.

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

### Reconocimiento de fotos (opcional, recomendado)

Sin nada configurado, "Añadir" sigue funcionando pero siempre hay que rellenar los datos a mano. Con [Ollama](https://ollama.com) instalado y corriendo (el mismo que usa `nous`):

```bash
ollama pull minicpm-v
```

Y descomenta `OLLAMA_BASE_URL=http://localhost:11434` en `backend/.env`. `minicpm-v` es, de los modelos de visión habituales en Ollama, de los que mejor lee texto pequeño (nombre, número, rareza) para su tamaño — alternativas: `llava`, `llama3.2-vision` (`OLLAMA_VISION_MODEL` en `backend/.env`).

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

## Tests

```bash
# Backend
cd backend && npm test

# Frontend
npm test

# E2E (Playwright, contra una base de datos de test aparte — nunca la real)
npm run test:e2e
```

## Qué hace la app

- **Añadir**: haz una foto a una carta o a una caja. Un modelo de visión local (Ollama) sugiere nombre, expansión, número y rareza — siempre revisas y editas antes de guardar, nunca se da de alta nada automáticamente. Eliges el destino: tu colección, la wishlist, o producto sellado.
- **Mi colección**: todos tus ejemplares, con tu propia estimación de valor (sin catálogo externo, no hay precio de mercado automático) y la diferencia frente a lo que pagaste. Buscador propio sobre lo que ya tienes.
- **Producto sellado**: sobres, cajas, ETBs — registro de compra con ubicación física y valor estimado a mano.
- **Plan**: tu checklist de compra mes a mes (comprar / abrir / guardar sellado), con presupuesto mensual, páginas de compra habituales y notas generales del año. El "hecho" de cada ítem es una casilla de seguimiento independiente — no registra nada en tu colección ni cuenta en el valor total.
- **Wishlist**: deseos puntuales de algo que no tienes todavía, con prioridad, precio máximo y un **mes objetivo de compra** — agrupa la propia wishlist por mes, sin necesitar una pantalla aparte. "Ya la tengo" mueve el deseo a tu colección registrando la compra real.
- **Resumen**: valor total (cartas + sellado), lo invertido, ganancia o pérdida estimada — y un aviso aparte para lo que no tiene valor estimado todavía (nunca se cuenta como 0€ en silencio).

## Estructura

- `src/` — frontend (React + Vite + Tailwind).
- `backend/src/domain|application|infrastructure/` — hexagonal: dominio puro, casos de uso, adaptadores (Postgres, visión).
- `backend/src/infrastructure/vision/` — `ollamaVisionProvider.ts` (real, Ollama local) + `fakeVisionProvider.ts` (tests/E2E).
- `e2e/` — Playwright, contra el proveedor de visión fake (determinista, forzado en `playwright.config.ts`).

Más detalle de las decisiones técnicas (por qué no hay catálogo externo, cómo funciona el reconocimiento por foto, por qué no hay auth todavía) en [ARCHITECTURE.md](ARCHITECTURE.md).

## Privacidad

Herramienta de uso personal: no hay despliegue público. Los datos viven en tu propia base de datos local (Docker), igual que rumbo/nous/faro. Las fotos se procesan con un modelo de IA local (Ollama, en tu propia máquina) — nunca se suben a un servicio de terceros.
