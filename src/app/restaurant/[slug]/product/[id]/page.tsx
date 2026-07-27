"use client";

import { use, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Clock, ShoppingBag, Plus, Minus, Star, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/shared/product-image";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useWebStore } from "@/store/web.store";
import { publicService } from "@/services/public.service";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";

export default function ProductDetailPage(props: { params: Promise<{ slug: string; id: string }> }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ProductDetailInner {...props} />
    </Suspense>
  );
}

function ProductDetailInner({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableFromQR = searchParams.get("table");
  const tableNumber = tableFromQR ? Number(tableFromQR) : null;
  const { cart, add, increment, decrement } = useWebStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [categoryName, setCategoryName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Carga el producto desde el MENÚ PÚBLICO del slug (no del store del POS).
  useEffect(() => {
    let alive = true;
    setLoading(true);
    publicService.getMenu(slug)
      .then((menu) => {
        if (!alive) return;
        const found = menu.products.find((p) => String(p.id) === String(id));
        if (found) {
          // Mapear a tipo Product del frontend
          setProduct({
            id: String(found.id),
            name: found.name,
            description: found.description,
            price: Number(found.price),
            category: String(found.category),
            image: found.image,
            tags: [],
            available: found.available,
            prepMinutes: found.prepMinutes,
            popular: found.popular,
          } as Product);
          const cat = menu.categories.find((c) => String(c.id) === String(found.category));
          setCategoryName(cat?.name ?? "");
        } else {
          setProduct(null);
        }
      })
      .catch(() => { if (alive) setProduct(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [slug, id]);

  const cartItem = cart.find((l) => String(l.product.id) === id);
  const qty = cartItem?.quantity ?? 0;
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);

  const back = () => router.push(`/restaurant/${slug}`);
  // "Ver carrito" vuelve a la carta y abre el Sheet del carrito (?cart=1),
  // conservando la mesa del QR si la hay.
  const viewCart = () => {
    const params = tableFromQR ? `?table=${tableNumber}&cart=1` : "?cart=1";
    router.push(`/restaurant/${slug}${params}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <span className="text-5xl">🍽️</span>
        <p className="font-semibold text-lg">Producto no encontrado</p>
        <Button variant="outline" onClick={back}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al menú
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header — fondo sólido para evitar bleeding */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-4">
        <button
          onClick={back}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="flex-1 truncate text-sm font-semibold">{product.name}</span>
        <ThemeToggle />
        {cartCount > 0 && (
          <button
            onClick={back}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {cartCount}
            </span>
          </button>
        )}
      </header>

      {/* Hero image */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative flex h-64 w-full items-center justify-center overflow-hidden bg-gradient-to-b from-muted to-muted/40 sm:h-72"
      >
        <ProductImage
          emoji={product.image}
          category={product.category}
          size="lg"
          className="h-full w-full rounded-none"
        />
        {product.popular && (
          <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-amber-950 shadow">
            <Star className="h-3 w-3 fill-current" /> Popular
          </span>
        )}
        {!product.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <span className="rounded-full bg-background px-4 py-1.5 text-sm font-semibold text-muted-foreground shadow">
              No disponible
            </span>
          </div>
        )}
      </motion.div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="mx-auto max-w-lg px-4 pb-36 pt-5 space-y-4"
      >
        {/* Nombre + precio */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-tight">{product.name}</h1>
            {categoryName && (
              <p className="mt-1 text-sm text-muted-foreground">{categoryName}</p>
            )}
          </div>
          <p className="shrink-0 text-2xl font-black text-primary">
            {formatCurrency(product.price)}
          </p>
        </div>

        {/* Tiempo prep */}
        {product.prepMinutes > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0 text-primary" />
            <span>Listo en aprox. <strong className="text-foreground">{product.prepMinutes} min</strong></span>
          </div>
        )}

        {/* Descripción */}
        {product.description && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descripción</h2>
            <p className="text-sm leading-relaxed text-foreground">{product.description}</p>
          </div>
        )}

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-full text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </motion.div>

      {/* CTA sticky — fondo sólido */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {/* Stepper de cantidad (visible si ya hay unidades de este producto) */}
          {qty > 0 && product.available && (
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-1">
              <button
                onClick={() => decrement(product.id)}
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-background"
                aria-label="Quitar uno"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-base font-bold">{qty}</span>
              <button
                onClick={() => increment(product.id)}
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-background"
                aria-label="Agregar uno"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}

          {product.available ? (
            <>
              {/* Agregar / Agregar más */}
              <Button
                className="h-12 flex-1 rounded-xl text-base font-semibold"
                onClick={() => { if (qty === 0) add(product); else increment(product.id); }}
              >
                {qty === 0 ? (
                  <><Plus className="mr-2 h-5 w-5" /> Agregar · {formatCurrency(product.price)}</>
                ) : (
                  <><Plus className="mr-2 h-5 w-5" /> Agregar otro</>
                )}
              </Button>
              {/* Ver carrito: vuelve a la carta donde está el Sheet del carrito */}
              {qty > 0 && (
                <Button
                  variant="outline"
                  className="h-12 rounded-xl text-base font-semibold"
                  onClick={viewCart}
                >
                  <ShoppingBag className="mr-2 h-5 w-5" /> Ver carrito ({cartCount})
                </Button>
              )}
            </>
          ) : (
            <Button disabled className="h-12 flex-1 rounded-xl text-base">
              No disponible
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
