/**
 * Redimensiona y comprime una foto antes de enviarla: una foto de móvil sin tratar
 * puede pesar varios MB, lo que hace lenta la subida sin aportar nada. 1600px/calidad
 * 0.9 deja margen de sobra para poder hacer zoom en el visor sin que se vea pixelada.
 * Vía canvas, sin librerías — mismo criterio del proyecto de no añadir una dependencia
 * para una operación puntual.
 */
export function compressImage(file: File, maxDimension = 1600, quality = 0.9): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se ha podido leer la foto"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se ha podido procesar la foto"));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se ha podido procesar la foto"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
