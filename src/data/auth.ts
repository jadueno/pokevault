const TOKEN_KEY = "pokevault_session_token";

/** "Recuérdame" marcado (por defecto): el token sobrevive a cerrar el navegador
 * (localStorage). Desmarcado: solo dura la pestaña/sesión actual (sessionStorage) — se
 * borra en las dos por si el usuario cambia de opción entre un login y el siguiente, para
 * no dejar un token viejo olvidado en el storage que ya no toca. */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string, remember: boolean): void {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
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
