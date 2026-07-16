import { useRef, useState } from "react";
import { compressImage } from "../../data/imageCapture";

/** `capture="environment"` abre directamente la cámara trasera en móvil (Safari/Chrome);
 * en escritorio, el selector de archivos normal. Sin librería de cámara: un input nativo
 * cubre el caso de uso entero. */
export function PhotoCapture({ onCapture }: { onCapture: (dataUrl: string) => void }) {
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
    <div className="flex flex-col items-center gap-3 py-12">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleChange} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={processing}
        aria-label="Hacer foto a una carta o caja"
        className="flex size-24 items-center justify-center rounded-full bg-[var(--beacon)] text-4xl text-[var(--on-beacon)] shadow-float transition-transform active:scale-95 disabled:opacity-60"
      >
        📷
      </button>
      <p className="text-sm text-[var(--text-secondary)]">
        {processing ? "Procesando foto…" : "Haz una foto a la carta o a la caja"}
      </p>
      {error && (
        <p role="alert" className="text-sm text-[var(--status-critical)]">
          {error}
        </p>
      )}
    </div>
  );
}
