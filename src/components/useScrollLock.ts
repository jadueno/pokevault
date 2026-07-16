import { useEffect } from "react";

let lockCount = 0;
let previousBodyOverflow = "";
let previousHtmlOverflow = "";

/**
 * Bloquea el scroll de la página de fondo mientras el componente que lo usa está
 * montado — sin esto, un modal o el visor de fotos a pantalla completa dejaban hacer
 * scroll en la capa de abajo por debajo del overlay. Se bloquea tanto `<html>` como
 * `<body>` porque cuál de los dos es el "elemento de scroll" real depende del navegador
 * y de si el contenido de `<body>` fuerza su propia altura (aquí no lo hace, así que
 * bloquear solo `<body>` no bastaba: el scroll seguía pasando por `<html>`).
 * Contador global (no un simple on/off) porque puede haber overlays anidados: una foto
 * (PhotoLightbox) abierta desde dentro de un formulario que ya está en un Modal — el
 * scroll solo debe desbloquearse cuando se cierra el último.
 */
export function useScrollLock(): void {
  useEffect(() => {
    if (lockCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      previousHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }
    lockCount++;
    return () => {
      lockCount--;
      if (lockCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
        document.documentElement.style.overflow = previousHtmlOverflow;
      }
    };
  }, []);
}
