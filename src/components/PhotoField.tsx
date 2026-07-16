import { useRef, useState } from "react";
import { compressImage } from "../data/imageCapture";
import { focusRing } from "./Field";
import { PhotoLightbox } from "./PhotoLightbox";

/** Control de foto reutilizable: miniatura + añadir/cambiar/quitar. Mismo helper de
 * compresión que usa "Añadir" (PhotoCapture), así que el peso guardado es el mismo
 * tanto si la foto viene del flujo de reconocimiento como si se adjunta aquí directamente.
 * Clic en la miniatura abre la foto a tamaño completo (PhotoLightbox), separado de los
 * botones de cambiar/quitar para no confundir "ver" con "editar". */
export function PhotoField({
  label = "Foto",
  photo,
  onChange,
}: {
  label?: string;
  photo: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProcessing(true);
    try {
      onChange(await compressImage(file));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--text-secondary)]">{label}</span>
      <div className="flex items-center gap-3">
        {photo ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="Ver foto en grande"
            className={`shrink-0 rounded-lg ${focusRing}`}
          >
            <img src={photo} alt="" className="size-16 rounded-lg border border-[var(--border)] object-cover" />
          </button>
        ) : (
          <div
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-xl text-[var(--text-muted)]"
          >
            📷
          </div>
        )}
        <div className="flex flex-col items-start gap-1">
          <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleChange} className="hidden" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={processing}
            className={`text-xs font-semibold text-[var(--beacon)] hover:underline disabled:opacity-60 ${focusRing}`}
          >
            {processing ? "Procesando…" : photo ? "Cambiar foto" : "Añadir foto"}
          </button>
          {photo && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className={`text-xs text-[var(--text-muted)] hover:text-[var(--status-critical)] ${focusRing}`}
            >
              Quitar foto
            </button>
          )}
        </div>
      </div>

      {lightboxOpen && photo && <PhotoLightbox src={photo} alt={label} onClose={() => setLightboxOpen(false)} />}
    </div>
  );
}
