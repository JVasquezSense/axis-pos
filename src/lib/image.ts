/**
 * Reducción de fotos antes de guardarlas.
 *
 * La foto de la factura se guardaba como data URL tal cual salía de la cámara:
 * 4–8 MB que, en base64, superan el límite de cuerpo de petición del servidor
 * (2,5 MB por defecto en Django) y hacían fallar el registro de la compra sin
 * explicar por qué. Reducida a 1400 px y JPEG 0.7 queda en unos cientos de KB y
 * la factura se sigue leyendo perfectamente.
 */

export interface ShrinkOptions {
  maxSide?: number;
  quality?: number;
}

export async function shrinkImageFile(
  file: File,
  { maxSide = 1400, quality = 0.7 }: ShrinkOptions = {}
): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  // Los formatos que el navegador no sabe dibujar (HEIC en algunos equipos) se
  // devuelven tal cual: mejor la foto original que ninguna.
  try {
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    if (scale === 1 && dataUrl.length < 400_000) return dataUrl;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return dataUrl;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Formato de imagen no soportado"));
    img.src = src;
  });
}

/** Tamaño aproximado en bytes de un data URL base64. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return dataUrl.length;
  return Math.round(((dataUrl.length - comma - 1) * 3) / 4);
}
