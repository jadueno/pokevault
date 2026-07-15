export class ValidationError extends Error {}

export function assertNonEmpty(value: string, field: string): void {
  if (!value || !value.trim()) throw new ValidationError(`${field} no puede estar vacío`);
}
