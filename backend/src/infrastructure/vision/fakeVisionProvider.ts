import type { RecognizedCardData, RecognizedPriceData } from "../../domain/types.js";
import type { VisualMatchProvider } from "../../domain/ports.js";

/** Fixture determinista para tests/E2E: no depende de Ollama ni de red. */
export function createFakeVisionProvider(): VisualMatchProvider {
  return {
    name: "fake",
    async recognizeCard(): Promise<RecognizedCardData> {
      return {
        name: "Charizard",
        setName: "Base",
        number: "4/102",
        rarity: "Rare Holo",
        variant: "holo",
        language: "en",
        confidence: "high",
      };
    },
    async recognizePriceScreenshot(): Promise<RecognizedPriceData> {
      return { name: "Zarude", setName: "MEP Black Star Promos", rarity: "P", referencePrice: 3.73 };
    },
  };
}
