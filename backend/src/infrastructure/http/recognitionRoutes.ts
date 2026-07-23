import type { FastifyInstance } from "fastify";
import type { createCardRecognitionUseCases } from "../../application/cardRecognition.js";
import { handleError } from "./crudRoutes.js";

export function registerRecognitionRoutes(
  app: FastifyInstance,
  useCases: ReturnType<typeof createCardRecognitionUseCases>,
): void {
  app.post("/card-recognition", async (request, reply) => {
    try {
      const { imageDataUrl } = request.body as { imageDataUrl: string };
      const result = await useCases.recognize(imageDataUrl);
      reply.send(result);
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.post("/price-screenshot-recognition", async (request, reply) => {
    try {
      const { imageDataUrl } = request.body as { imageDataUrl: string };
      const result = await useCases.recognizePriceScreenshot(imageDataUrl);
      reply.send(result);
    } catch (error) {
      handleError(error, reply);
    }
  });
}
