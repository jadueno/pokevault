import type { RecognitionConfidence, RecognizedCardData } from "../../domain/types.js";
import type { VisualMatchProvider } from "../../domain/ports.js";

const PROMPT = `Eres un asistente que identifica cartas y productos sellados de Pokémon TCG a partir de una foto.
Devuelve SOLO un objeto JSON, sin texto adicional ni markdown, con estas claves exactas:
{"name": string o null, "setName": string o null, "number": string o null, "rarity": string o null, "confidence": "high"|"medium"|"low" o null}

- "name": el nombre del Pokémon o del producto (p. ej. "Charizard", "ETB Escarlata y Púrpura").
- "setName": el nombre de la expansión, si es legible.
- "number": el número de carta tal como aparece (p. ej. "4/102"), o null si no es una carta suelta.
- "rarity": la rareza si se puede deducir (p. ej. "Rare Holo", "Illustration Rare"), o null.
- "confidence": tu confianza en la identificación global.

No inventes ningún dato que no puedas ver en la imagen: si no estás seguro, pon null en ese campo.`;

const VALID_CONFIDENCE: RecognitionConfidence[] = ["high", "medium", "low"];

const EMPTY_RESULT: RecognizedCardData = { name: null, setName: null, number: null, rarity: null, confidence: null };

function extractJson(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : content).trim();
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseRecognizedCard(content: string): RecognizedCardData {
  const parsed = JSON.parse(extractJson(content)) as Record<string, unknown>;
  const confidence = VALID_CONFIDENCE.includes(parsed.confidence as RecognitionConfidence)
    ? (parsed.confidence as RecognitionConfidence)
    : null;
  return {
    name: toNullableString(parsed.name),
    setName: toNullableString(parsed.setName),
    number: toNullableString(parsed.number),
    rarity: toNullableString(parsed.rarity),
    confidence,
  };
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
      const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: PROMPT, images: [base64] }],
          format: "json",
          stream: false,
        }),
      });
      if (!res.ok) throw new Error(`Ollama (visión) respondió ${res.status}: ${await res.text()}`);
      const body = (await res.json()) as { message: { content: string } };
      try {
        return parseRecognizedCard(body.message.content);
      } catch {
        // El modelo local no siempre devuelve JSON válido — mejor un resultado vacío
        // (el usuario rellena a mano) que romper el flujo de alta.
        return EMPTY_RESULT;
      }
    },
  };
}
