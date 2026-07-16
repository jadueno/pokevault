import { useEffect, useState } from "react";

/** Visor de foto a pantalla completa: clic para alternar entre ajustada y tamaño
 * natural (con scroll para moverse), más el zoom nativo del navegador (pellizcar en
 * móvil, Ctrl/⌘ + rueda en escritorio) — no hace falta reimplementarlo, basta con no
 * bloquearlo (sin `touch-action: none` ni tocar el viewport). */
export function PhotoLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Foto"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-black/50 text-2xl text-white transition-colors hover:bg-black/70"
      >
        ×
      </button>
      <div
        className={`max-h-full max-w-full p-4 ${zoomed ? "overflow-auto" : "overflow-hidden"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <img
          src={src}
          alt={alt}
          onClick={() => setZoomed((z) => !z)}
          className={
            zoomed
              ? "max-w-none cursor-zoom-out rounded-lg"
              : "max-h-[85vh] max-w-full cursor-zoom-in rounded-lg object-contain"
          }
        />
      </div>
    </div>
  );
}
