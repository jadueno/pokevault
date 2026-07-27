import { createHmac, timingSafeEqual } from "node:crypto";

// 30 días: es una app personal de uso diario — no tiene sentido pedir credenciales a
// cada rato. Cerrar sesión desde la app invalida el token guardado en el propio
// dispositivo (no hay lista de tokens revocados en el servidor, ver más abajo).
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Token de sesión firmado (HMAC-SHA256), sin estado en el servidor: nada que guardar en
 * base de datos ni que se pierda si se reinicia el proceso — el propio token lleva su
 * fecha de caducidad, firmada para que no se pueda alterar sin conocer `secret`. */
export function createSessionToken(secret: string): string {
  const payload = String(Date.now() + SESSION_DURATION_MS);
  const signature = sign(payload, secret);
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifySessionToken(token: string, secret: string): boolean {
  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString();
  } catch {
    return false;
  }
  const [payload, signature] = decoded.split(".");
  if (!payload || !signature) return false;

  const expectedBuf = Buffer.from(sign(payload, secret));
  const signatureBuf = Buffer.from(signature);
  if (signatureBuf.length !== expectedBuf.length || !timingSafeEqual(signatureBuf, expectedBuf)) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}
