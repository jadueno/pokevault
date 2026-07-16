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
  size = "md",
  glow,
}: {
  label?: string;
  photo: string | null;
  onChange: (dataUrl: string | null) => void;
  /** "md" (por defecto): miniatura compacta, para formularios y listados densos
   * (producto sellado). "lg": foto protagonista — pensada para donde la imagen es lo
   * primero que se debe mirar (wishlist), con más tamaño y hueco para el `glow`. */
  size?: "md" | "lg";
  /** Color CSS (p. ej. el `bg` de un tono de Badge) para un resplandor alrededor de la
   * miniatura — usado en wishlist para que la prioridad se note también en la foto, no
   * solo en la insignia. */
  glow?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const thumbSize = size === "lg" ? "size-28 sm:size-32" : "size-20";
  const glowStyle = glow
    ? {
        boxShadow: `0 0 0 3px color-mix(in srgb, ${glow} 50%, transparent), 0 10px 24px -6px color-mix(in srgb, ${glow} 55%, transparent)`,
      }
    : undefined;

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
            className={`shrink-0 rounded-xl ${focusRing}`}
          >
            <img
              src={photo}
              alt=""
              className={`${thumbSize} rounded-xl border border-[var(--border)] object-cover transition-shadow duration-200`}
              style={glowStyle}
            />
          </button>
        ) : (
          <div
            aria-hidden="true"
            className={`flex ${thumbSize} shrink-0 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-2xl text-[var(--text-muted)]`}
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
