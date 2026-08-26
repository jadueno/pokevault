// Antes: `origin: true` (refleja cualquier origen). El token de sesión va en la
// cabecera `Authorization`, no en una cookie, así que una web maliciosa nunca podía
// robar-y-reenviar credenciales solo por tener CORS abierto (no tiene forma de leer el
// token guardado en el localStorage de este origen distinto). Aun así, "cualquier
// origen" es más superficie de la necesaria.
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

/**
 * Callback de origen para `@fastify/cors`, con dos modos:
 * - **Desplegado** (`isDeployed: true`, VPS con `NODE_ENV=production`): solo el dominio
 *   real. La instancia desplegada nunca se ve a sí misma desde una IP de LAN/Tailscale
 *   — esas redes ni siquiera llegan hasta la VPS — así que permitirlas ahí era
 *   superficie sin ningún uso real detrás.
 * - **Local** (`isDeployed: false`, `npm run dev` sin `NODE_ENV`): además del dominio,
 *   localhost/LAN/Tailscale — necesario de verdad aquí, porque en local el frontend y el
 *   backend corren en puertos distintos (orígenes distintos para CORS) y se acceden
 *   desde el móvil por Tailscale o la misma red WiFi.
 *
 * Sin cabecera `Origin` (peticiones no-browser: curl, servidor a servidor) se deja
 * pasar siempre — CORS solo protege peticiones desde un navegador.
 */
export function createOriginChecker(isDeployed: boolean) {
  return function isAllowedOrigin(origin: string | undefined, callback: (err: Error | null, allow: boolean) => void): void {
    if (!origin || origin === PRODUCTION_ORIGIN) {
      callback(null, true);
      return;
    }
    if (!isDeployed && PRIVATE_NETWORK_ORIGIN.test(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  };
}

export const isAllowedOrigin = createOriginChecker(process.env.NODE_ENV === "production");
