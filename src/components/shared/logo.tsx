import { cn } from "@/lib/utils";

/** Emblema Axis: tenedor y cuchillo cruzados formando una X (estilo del logo). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={cn("text-gold", className)} aria-hidden>
      <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {/* Tenedor (de arriba-izquierda a abajo-derecha) */}
        <path d="M17 9v9" />
        <path d="M22 9v9" />
        <path d="M27 9v9" />
        <path d="M22 18c0 3-5 4-5 8 0 3 3 4 5 5l21 26" />
        {/* Cuchillo (de arriba-derecha a abajo-izquierda) */}
        <path d="M47 9c4 3 4 11 0 16-2 2-4 2-5 3L21 56" />
      </g>
    </svg>
  );
}

/** Marca completa: emblema + palabra AXIS + bajada POS SYSTEM. */
export function LogoLockup({
  className,
  size = "md",
  tagline = true,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  tagline?: boolean;
}) {
  const mark = { sm: "h-7 w-7", md: "h-10 w-10", lg: "h-16 w-16" }[size];
  const word = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" }[size];
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <LogoMark className={mark} />
      <p className={cn("font-black tracking-[0.2em]", word)}>AXIS</p>
      {tagline && <p className="text-gold text-[10px] font-semibold tracking-[0.45em]">POS SYSTEM</p>}
    </div>
  );
}
