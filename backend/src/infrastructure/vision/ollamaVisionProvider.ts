import type { CardLanguage, CardVariant, RecognitionConfidence, RecognizedCardData, RecognizedPriceData } from "../../domain/types.js";
import type { VisualMatchProvider } from "../../domain/ports.js";

const PROMPT = `Eres un asistente que identifica cartas y productos sellados de Pokémon TCG a partir de una foto.
Devuelve SOLO un objeto JSON, sin texto adicional ni markdown, con estas claves exactas:
{"name": string o null, "setName": string o null, "number": string o null, "rarity": string o null, "variant": "normal"|"reverse"|"holo" o null, "language": "en"|"es"|"fr"|"de"|"it"|"pt"|"ja"|"ko"|"zh-cn"|"zh-tw"|"id"|"th" o null, "confidence": "high"|"medium"|"low" o null}

- "name": el nombre del Pokémon o del producto (p. ej. "Charizard", "ETB Escarlata y Púrpura").
- "setName": el nombre de la expansión, si es legible.
- "number": el número de carta tal como aparece (p. ej. "4/102"), o null si no es una carta suelta.
- "rarity": la rareza si se puede deducir (p. ej. "Rare Holo", "Illustration Rare"), o null.
- "variant": "holo" si toda la ilustración brilla con acabado holográfico, "reverse" si solo el fondo/marco brilla y la ilustración queda mate, "normal" si el acabado es liso sin brillo. Pon null si el brillo no se aprecia bien en la foto.
- "language": el idioma del texto impreso en la carta (nombres de ataques, reglas...), o null si no es legible.
- "confidence": tu confianza en la identificación global.

No inventes ningún dato que no puedas ver en la imagen: si no estás seguro, pon null en ese campo.`;

const PRICE_SCREENSHOT_PROMPT = `Eres un asistente que lee capturas de pantalla de la página de una carta en Cardmarket.com (mercado de cartas Pokémon).
Devuelve SOLO un objeto JSON, sin texto adicional ni markdown, con estas claves exactas:
{"name": string o null, "setName": string o null, "rarity": string o null, "referencePrice": number o null}

- "name": el nombre de la carta (el Pokémon o producto que ilustra la imagen de la carta).
- "setName": el valor de la fila "Impreso en" (el nombre de la expansión), sin el icono.
- "rarity": el valor de la fila "Rareza".
- "referencePrice": el valor de la fila "Tendencia de precio", como número en euros. Los precios en la imagen usan coma como separador decimal, no de miles (p. ej. "3,73 €" son tres euros con setenta y tres céntimos): devuélvelo con PUNTO decimal y ese mismo valor, sin multiplicar ni añadir ceros (3.73, nunca 373 ni 3730). Si no aparece esa fila, usa "Precio medio 30 dias" con el mismo criterio.

No inventes ningún dato que no puedas ver en la imagen: si no estás seguro o la fila no aparece, pon null en ese campo.`;

const VALID_CONFIDENCE: RecognitionConfidence[] = ["high", "medium", "low"];
const VALID_VARIANT: CardVariant[] = ["normal", "reverse", "holo"];
const VALID_LANGUAGE: CardLanguage[] = ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh-cn", "zh-tw", "id", "th"];

const EMPTY_RESULT: RecognizedCardData = {
  name: null,
  setName: null,
  number: null,
  rarity: null,
  variant: null,
  language: null,
  confidence: null,
};
const EMPTY_PRICE_RESULT: RecognizedPriceData = { name: null, setName: null, rarity: null, referencePrice: null };

function extractJson(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : content).trim();
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toNullableEnum<T extends string>(value: unknown, valid: readonly T[]): T | null {
  return typeof value === "string" && (valid as readonly string[]).includes(value) ? (value as T) : null;
}

function parseRecognizedCard(content: string): RecognizedCardData {
  const parsed = JSON.parse(extractJson(content)) as Record<string, unknown>;
  return {
    name: toNullableString(parsed.name),
    setName: toNullableString(parsed.setName),
    number: toNullableString(parsed.number),
    rarity: toNullableString(parsed.rarity),
    variant: toNullableEnum(parsed.variant, VALID_VARIANT),
    language: toNullableEnum(parsed.language, VALID_LANGUAGE),
    confidence: toNullableEnum(parsed.confidence, VALID_CONFIDENCE),
  };
}

function parseRecognizedPrice(content: string): RecognizedPriceData {
  const parsed = JSON.parse(extractJson(content)) as Record<string, unknown>;
  return {
    name: toNullableString(parsed.name),
    setName: toNullableString(parsed.setName),
    rarity: toNullableString(parsed.rarity),
    referencePrice: toNullableNumber(parsed.referencePrice),
  };
}

/** Una sola llamada de chat con imagen a Ollama — compartida por las dos tareas de
 * reconocimiento (foto de carta y captura de Cardmarket), que solo difieren en el prompt
 * y en cómo se interpreta la respuesta. */
async function callVisionModel(baseUrl: string, model: string, prompt: string, imageDataUrl: string): Promise<string> {
  const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt, images: [base64] }],
      format: "json",
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Ollama (visión) respondió ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { message: { content: string } };
  return body.message.content;
}

/**
 * Adaptador real: modelo de visión local vía Ollama (mismo patrón sin SDK que
 * infrastructure/llm/ollamaProvider.ts en nous — una sola llamada HTTP no justifica una
 * dependencia extra). "minicpm-v" por defecto: entre los modelos de visión de Ollama es
 * de los que mejor lee texto pequeño (nombre/número/rareza en la carta) para su tamaño.
 * Nunca se guarda nada automáticamente: el resultado siempre se revisa/edita a mano
 * antes de dar de alta (ver application/cardRecognition.ts).
 */
export function createOllamaVisionProvider(baseUrl: string, model = "minicpm-v"): VisualMatchProvider {
  return {
    name: "ollama",
    async recognizeCard(imageDataUrl: string): Promise<RecognizedCardData> {
      try {
        return parseRecognizedCard(await callVisionModel(baseUrl, model, PROMPT, imageDataUrl));
      } catch {
        // El modelo local no siempre devuelve JSON válido — mejor un resultado vacío
        // (el usuario rellena a mano) que romper el flujo de alta.
        return EMPTY_RESULT;
      }
    },
    async recognizePriceScreenshot(imageDataUrl: string): Promise<RecognizedPriceData> {
      try {
        return parseRecognizedPrice(await callVisionModel(baseUrl, model, PRICE_SCREENSHOT_PROMPT, imageDataUrl));
      } catch {
        return EMPTY_PRICE_RESULT;
      }
    },
  };
}
