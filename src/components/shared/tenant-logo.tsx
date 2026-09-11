import { cn } from "@/lib/utils";

/**
 * Logo del restaurante: emoji o foto.
 *
 * El logo se guardaba como texto y varias pantallas lo pintaban tal cual;
 * cuando el restaurante subía una foto, salía la cadena base64 entera como si
 * fuera el nombre. Aquí se decide una sola vez qué es y cómo se dibuja.
 */
export function isLogoImage(src?: string | null): boolean {
  if (!src) return false;
  return src.startsWith("data:") || src.startsWith("http") || src.startsWith("/") || src.startsWith("blob:");
}

export function TenantLogo({
  src,
  className,
  imgClassName,
  fallback = "🍽️",
}: {
  src?: string | null;
  /** Clases del contenedor (tamaño, fondo, esquinas). */
  className?: string;
  imgClassName?: string;
  fallback?: string;
}) {
  if (isLogoImage(src)) {
    return (
      <span className={cn("flex shrink-0 items-center justify-center overflow-hidden", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src!} alt="" className={cn("h-full w-full object-cover", imgClassName)} />
      </span>
    );
  }
  return (
    <span className={cn("flex shrink-0 items-center justify-center", className)}>
      {src || fallback}
    </span>
  );
}
