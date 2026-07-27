import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// 64 bytes de salida: tamaño habitual para scrypt, generoso sin ser excesivo.
const KEY_LENGTH = 64;

/** Hash de contraseña con scrypt — nativo de Node, sin añadir una dependencia (bcrypt/
 * argon2) solo para esto. Formato de salida "salt:hash", ambos en hex, para poder
 * guardarlo entero en una única variable de entorno (`LOGIN_PASSWORD_HASH`). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

/** Compara en tiempo constante — nunca con `===` sobre el hash calculado, que filtraría
 * por temporización cuánto coincide un intento con el hash guardado. */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const candidate = scryptSync(password, salt, KEY_LENGTH);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
