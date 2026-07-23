import type { VisualMatchProvider } from "../domain/ports.js";
import { assertNonEmpty, ValidationError } from "./errors.js";

function assertImageDataUrl(imageDataUrl: string, label: string): void {
  assertNonEmpty(imageDataUrl, label);
  if (!imageDataUrl.startsWith("data:image/")) {
    throw new ValidationError(`${label} debe enviarse como data URL de imagen`);
  }
}

export function createCardRecognitionUseCases(provider: VisualMatchProvider) {
  return {
    recognize: (imageDataUrl: string) => {
      assertImageDataUrl(imageDataUrl, "La foto");
      return provider.recognizeCard(imageDataUrl);
    },
    recognizePriceScreenshot: (imageDataUrl: string) => {
      assertImageDataUrl(imageDataUrl, "La captura");
      return provider.recognizePriceScreenshot(imageDataUrl);
    },
  };
}
