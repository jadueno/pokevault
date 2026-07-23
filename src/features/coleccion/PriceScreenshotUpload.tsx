import { useRef, useState } from "react";
import { compressImage } from "../../data/imageCapture";

/** Sin `capture`: a diferencia de PhotoCapture (que abre la cámara), esto es una captura
 * de pantalla ya hecha — el selector debe abrir la galería/archivos, nunca la cámara. */
export function PriceScreenshotUpload({ onCapture, disabled }: { onCapture: (dataUrl: string) => void; disabled?: boolean }) {
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
      setError(err instanceof Error ? err.message : "No se ha podido procesar la captura");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || processing}
        className="self-start text-sm font-semibold text-[var(--beacon)] underline decoration-dotted underline-offset-4 disabled:opacity-60"
      >
        {processing ? "Leyendo la captura…" : "¿No aparece? Sube una captura de Cardmarket"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-[var(--status-critical)]">
          {error}
        </p>
      )}
    </div>
  );
}
