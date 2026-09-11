import { cn } from "@/lib/utils";
import { PRODUCT_GRADIENTS } from "@/mock/menu";

interface ProductImageProps {
  emoji: string;
  category?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "text-2xl", md: "text-4xl", lg: "text-6xl" };

function isImageUrl(src: string) {
  return src.startsWith("data:") || src.startsWith("http") || src.startsWith("/") || src.startsWith("blob:");
}

export function ProductImage({ emoji, category, className, size = "md" }: ProductImageProps) {
  const gradient = category ? PRODUCT_GRADIENTS[category] ?? "from-muted to-muted" : "from-muted to-muted";
  if (isImageUrl(emoji)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      // contain sobre un fondo suave: con cover, una lata o una botella vertical
      // quedaba recortada por arriba y por abajo y no se veía qué era.
      <span className={cn("flex items-center justify-center overflow-hidden rounded-xl bg-muted", className)}>
        <img src={emoji} alt="" className="h-full w-full object-contain" />
      </span>
    );
  }
  return (
    <div className={cn("flex items-center justify-center rounded-xl bg-gradient-to-br", gradient, sizes[size], className)}>
      <span className="drop-shadow-sm">{emoji}</span>
    </div>
  );
}
