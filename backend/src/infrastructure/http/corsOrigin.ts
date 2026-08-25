// Antes: `origin: true` (refleja cualquier origen). El token de sesión va en la
// cabecera `Authorization`, no en una cookie, así que una web maliciosa nunca podía
// robar-y-reenviar credenciales solo por tener CORS abierto (no tiene forma de leer el
// token guardado en el localStorage de este origen distinto). Aun así, "cualquier
// origen" es más superficie de la necesaria: se restringe al dominio de producción y a
// las redes desde las que se usa la app en el día a día (localhost, LAN, Tailscale),
// dejando fuera cualquier web pública al azar — sin esto último, cambiar de red local
// (casa/oficina/hotel) o entrar por Tailscale rompería la app.
const PRODUCTION_ORIGIN = "https://pokevault.jadueno.com";

const PRIVATE_NETWORK_ORIGIN = new RegExp(
  "^https?://(" +
    "localhost|127\\.0\\.0\\.1|" +
    "192\\.168\\.\\d{1,3}\\.\\d{1,3}|" +
    "10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}|" +
    "172\\.(1[6-9]|2\\d|3[01])\\.\\d{1,3}\\.\\d{1,3}|" +
    // Tailscale (CGNAT): 100.64.0.0/10
    "100\\.(6[4-9]|[7-9]\\d|1[01]\\d|12[0-7])\\.\\d{1,3}\\.\\d{1,3}" +
    ")(:\\d+)?$",
);

/** Callback de origen para `@fastify/cors`. Sin cabecera `Origin` (peticiones no-browser:
 * curl, servidor a servidor) se deja pasar — CORS solo protege peticiones desde un
 * navegador. */
export function isAllowedOrigin(origin: string | undefined, callback: (err: Error | null, allow: boolean) => void): void {
  if (!origin || origin === PRODUCTION_ORIGIN || PRIVATE_NETWORK_ORIGIN.test(origin)) {
    callback(null, true);
    return;
  }
  callback(null, false);
}
