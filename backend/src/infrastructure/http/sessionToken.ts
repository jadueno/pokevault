import { createHmac, timingSafeEqual } from "node:crypto";

// 30 días: es una app de uso diario — no tiene sentido pedir credenciales a cada rato.
// Cerrar sesión desde la app invalida el token guardado en el propio dispositivo (no hay
// lista de tokens revocados en el servidor, ver más abajo).
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Token de sesión firmado (HMAC-SHA256), sin estado en el servidor: nada que guardar en
 * base de datos ni que se pierda si se reinicia el proceso — el propio token lleva el id
 * del usuario y su fecha de caducidad, firmados para que no se puedan alterar sin conocer
 * `secret`. */
export function createSessionToken(secret: string, userId: string): string {
  const payload = JSON.stringify({ userId, expiresAt: Date.now() + SESSION_DURATION_MS });
  const signature = sign(payload, secret);
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifySessionToken(token: string, secret: string): { userId: string } | null {
  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString();
  } catch {
    return null;
  }
  // El payload es JSON (puede llevar puntos, p. ej. dentro de un email si algún día se
  // añadiera) — se separa por el ÚLTIMO punto, no por split(".") a secas.
  const lastDot = decoded.lastIndexOf(".");
  if (lastDot === -1) return null;
  const payload = decoded.slice(0, lastDot);
  const signature = decoded.slice(lastDot + 1);

  const expectedBuf = Buffer.from(sign(payload, secret));
  const signatureBuf = Buffer.from(signature);
  if (signatureBuf.length !== expectedBuf.length || !timingSafeEqual(signatureBuf, expectedBuf)) return null;

  let parsed: { userId?: string; expiresAt?: number };
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!parsed.userId || typeof parsed.expiresAt !== "number") return null;
  if (Date.now() >= parsed.expiresAt) return null;
  return { userId: parsed.userId };
}
