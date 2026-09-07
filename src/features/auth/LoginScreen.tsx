import { useState } from "react";
import { Button } from "../../components/Button";
import { Field, inputClass } from "../../components/Field";

/** Pantalla completa, sin nav ni contenido detrás — se muestra en vez de toda la app
 * (ver App.tsx) mientras no haya una sesión válida, no como un modal superpuesto: no
 * tiene sentido dejar entrever la colección de nadie detrás de un formulario de login. */
export function LoginScreen({
  onLogin,
}: {
  onLogin: (email: string, password: string, remember: boolean) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onLogin(email, password, remember);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center p-4">
      <div
        className="w-full max-w-sm rounded-[1.75rem] border border-[var(--border)] p-8 shadow-float"
        style={{ backgroundColor: "color-mix(in srgb, var(--surface-1) 92%, transparent)" }}
      >
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-full text-2xl"
            style={{ background: "var(--hero-gradient)" }}
          >
            🎴
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-[var(--beacon)]">
            PokéVault
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">Inicia sesión para gestionar tu colección</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Contraseña">
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 shrink-0 accent-[var(--beacon)]"
            />
            Recuérdame en este dispositivo
          </label>
          {error && (
            <p role="alert" className="text-sm text-[var(--status-critical)]">
              {error}
            </p>
          )}
          <Button type="submit" tone="beacon" disabled={loading} className="w-full">
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
