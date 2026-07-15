/**
 * Algunos casos de uso no son funciones `async` y lanzan sus errores de validación de
 * forma síncrona en vez de como una promesa rechazada (el try/catch de las rutas HTTP
 * los captura igual, pero `expect(...).rejects` necesita una promesa). Este helper
 * normaliza ambos casos para los tests.
 */
export function callAsync<T>(fn: () => T): Promise<T> {
  return Promise.resolve().then(fn);
}
