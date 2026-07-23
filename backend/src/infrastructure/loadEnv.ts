/** Reemplaza "dotenv/config": Node ya carga ficheros .env de forma nativa desde la v20.12
 * (estable, sin flag experimental, desde la v24 — la que usa este proyecto), sin depender
 * de un paquete de terceros. Motivo del cambio: dotenv >=17.4 mete publicidad dirigida a
 * agentes de IA en sus ficheros/logs (ver memoria "dotenv-skillmd-marketing").
 *
 * A diferencia de `dotenv.config()` (que no hacía nada si no encontraba el fichero),
 * `process.loadEnvFile()` LANZA una excepción ENOENT — se ignora ese caso concreto para
 * mantener el mismo comportamiento tolerante de antes: si no hay ".env" (p. ej. un
 * despliegue donde las variables ya llegan puestas por la plataforma), se sigue con lo
 * que ya tenga `process.env` en vez de tumbar el arranque.
 *
 * Import de solo efecto secundario (sin nada que exportar) a propósito: tiene que ser la
 * PRIMERA línea de cada punto de entrada, antes de cualquier otro import que lea
 * variables de entorno al cargarse (p. ej. "./infrastructure/db/pool.js"). Intercalar una
 * llamada de función entre dos imports en vez de esto NO garantiza ese orden bajo
 * tsx/esbuild — ver memoria "tsx-esbuild-import-hoisting-gotcha": ya rompió el arranque
 * en producción una vez por esto exacto. */
try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
