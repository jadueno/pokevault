import type { RecognizedCardData } from "../../domain/types.js";
import type { VisualMatchProvider } from "../../domain/ports.js";

/** Fixture determinista para tests/E2E: no depende de Ollama ni de red. */
export function createFakeVisionProvider(): VisualMatchProvider {
  return {
    name: "fake",
    async recognizeCard(): Promise<RecognizedCardData> {
      return { name: "Charizard", setName: "Base", number: "4/102", rarity: "Rare Holo", confidence: "high" };
    },
  };
}
