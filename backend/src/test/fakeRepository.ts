import type { Repository } from "../domain/ports.js";

/** Repositorio en memoria para testear casos de uso sin depender de Postgres. */
export function createFakeRepository<T extends { id: string }, TNew>(): Repository<T, TNew> {
  const rows: T[] = [];
  let nextId = 1;

  return {
    async list() {
      return [...rows];
    },
    async create(entity: TNew) {
      const created = { ...entity, id: String(nextId++) } as unknown as T;
      rows.push(created);
      return created;
    },
    async update(id: string, entity: TNew) {
      const index = rows.findIndex((r) => r.id === id);
      if (index === -1) return null;
      const updated = { ...entity, id } as unknown as T;
      rows[index] = updated;
      return updated;
    },
    async remove(id: string) {
      const index = rows.findIndex((r) => r.id === id);
      if (index === -1) return false;
      rows.splice(index, 1);
      return true;
    },
  };
}
