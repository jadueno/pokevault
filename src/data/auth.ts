const TOKEN_KEY = "pokevault_session_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Cualquier petición que reciba un 401 (token caducado, o el servidor cambió de
 * secreto) avisa aquí en vez de dejar el error silencioso en cada hook de datos por
 * separado — App.tsx se suscribe una vez y vuelve a mostrar el login. */
type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;

export function onUnauthorized(listener: UnauthorizedListener | null): void {
  unauthorizedListener = listener;
}

export function notifyUnauthorized(): void {
  unauthorizedListener?.();
}
