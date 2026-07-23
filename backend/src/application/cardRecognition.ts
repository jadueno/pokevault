import type { VisualMatchProvider } from "../domain/ports.js";
import { assertNonEmpty, ValidationError } from "./errors.js";

export function createCardRecognitionUseCases(provider: VisualMatchProvider) {
  return {
    recognize: (imageDataUrl: string) => {
      assertNonEmpty(imageDataUrl, "La foto");
      if (!imageDataUrl.startsWith("data:image/")) {
        throw new ValidationError("La foto debe enviarse como data URL de imagen");
      }
      return provider.recognizeCard(imageDataUrl);
    },
  };
}
