import type { SetChecklistRepository } from "../domain/ports.js";

/** Solo lectura desde la API — la sincronización la hace `syncSetChecklist.ts`
 * directamente contra la base de datos, como un script puntual, nunca en una petición. */
export function createSetChecklistUseCases(repo: SetChecklistRepository) {
  return {
    list: () => repo.list(),
    getCards: (checklistId: string) => repo.getCards(checklistId),
  };
}
