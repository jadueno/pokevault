import { describe, expect, it } from "vitest";
import type { VisualMatchProvider } from "../domain/ports.js";
import type { RecognizedCardData } from "../domain/types.js";
import { callAsync } from "../test/callAsync.js";
import { createCardRecognitionUseCases } from "./cardRecognition.js";

const FIXTURE: RecognizedCardData = { name: "Charizard", setName: "Base", number: "4/102", rarity: "Rare Holo", confidence: "high" };

function fakeProvider(): VisualMatchProvider {
  return { name: "fake", recognizeCard: async () => FIXTURE };
}

describe("createCardRecognitionUseCases", () => {
  it("delega en el proveedor de visión con una data URL válida", async () => {
    const useCases = createCardRecognitionUseCases(fakeProvider());
    const result = await useCases.recognize("data:image/jpeg;base64,AAAA");
    expect(result).toEqual(FIXTURE);
  });

  it("rechaza una foto vacía", async () => {
    const useCases = createCardRecognitionUseCases(fakeProvider());
    await expect(callAsync(() => useCases.recognize(""))).rejects.toThrow("no puede estar vacío");
  });

  it("rechaza algo que no sea una data URL de imagen", async () => {
    const useCases = createCardRecognitionUseCases(fakeProvider());
    await expect(callAsync(() => useCases.recognize("https://ejemplo.com/foto.jpg"))).rejects.toThrow(
      "data URL de imagen",
    );
  });
});
