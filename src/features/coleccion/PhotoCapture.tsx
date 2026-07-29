import { useRef, useState } from "react";
import { compressImage } from "../../data/imageCapture";

/** `capture="environment"` abre directamente la cámara trasera en móvil (Safari/Chrome);
 * en escritorio, el selector de archivos normal. Sin librería de cámara: un input nativo
 * cubre el caso de uso entero.
 *
 * Bug real reportado por el usuario (2026-07-29): "le doy a foto y no hace nada" — la
 * captura SÍ funcionaba (comprobado con logs), pero justo donde está el botón no había
 * ningún cambio visible: al terminar de procesar, volvía a mostrarse el mismo botón y el
 * mismo texto de partida, y el único aviso real de que la foto se había guardado vivía
 * en un mensaje aparte, mucho más abajo del formulario. Ahora `value` (la foto ya
 * capturada, si la hay) se muestra aquí mismo como miniatura en vez de texto perdido. */
export function PhotoCapture({ value, onCapture }: { value: string | null; onCapture: (dataUrl: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setProcessing(true);
    try {
      const dataUrl = await compressImage(file);
      onCapture(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido procesar la foto");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] py-6">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleChange} className="hidden" />
      {value ? (
        <img src={value} alt="Foto que has hecho de la carta" className="h-28 rounded-xl object-cover shadow-card" />
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={processing}
          aria-label="Hacer foto a una carta"
          className="flex size-16 items-center justify-center rounded-full bg-[var(--beacon)] text-3xl text-[var(--on-beacon)] shadow-float transition-transform active:scale-95 disabled:opacity-60"
        >
          📷
        </button>
      )}
      {value ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={processing}
          className="text-sm font-semibold text-[var(--beacon)] disabled:opacity-60"
        >
          {processing ? "Procesando foto…" : "✓ Foto guardada — cambiar"}
        </button>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">{processing ? "Procesando foto…" : "Haz una foto para guardarla con la carta"}</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-[var(--status-critical)]">
          {error}
        </p>
      )}
    </div>
  );
}
