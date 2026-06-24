"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, ShoppingBag, Plus, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/shared/product-image";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useMenuStore } from "@/store/menu.store";
import { useWebStore } from "@/store/web.store";
import { formatCurrency } from "@/lib/utils";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = use(params);
  const router = useRouter();
  const products = useMenuStore((s) => s.products);
  const categories = useMenuStore((s) => s.categories);
  const { cart, add, increment, decrement } = useWebStore();

  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);
  const category = useMemo(
    () => categories.find((c) => c.id === product?.category),
    [categories, product]
  );

  const cartItem = cart.find((l) => l.product.id === id);
  const qty = cartItem?.quantity ?? 0;
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <p className="text-2xl">🍽️</p>
        <p className="font-semibold">Producto no encontrado</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al menú
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
        <button
          onClick={() => router.push(`/restaurant/${slug}`)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="flex-1 truncate text-sm font-medium">{product.name}</span>
        <ThemeToggle />
        {cartCount > 0 && (
          <button
            onClick={() => router.push(`/restaurant/${slug}`)}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {cartCount}
            </span>
          </button>
        )}
      </header>

      {/* Content */}
      <div className="mx-auto w-full max-w-lg flex-1 px-4 pb-32 pt-6">
        {/* Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex h-56 w-full items-center justify-center rounded-2xl border border-border bg-muted text-7xl shadow-sm"
        >
          <ProductImage emoji={product.image} category={product.category} size="lg" />
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-5 space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold">{product.name}</h1>
              {category && (
                <p className="mt-0.5 text-sm text-muted-foreground">{category.name}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{formatCurrency(product.price)}</p>
              {product.popular && (
                <Badge className="mt-1 text-xs" variant="secondary">
                  ⭐ Popular
                </Badge>
              )}
            </div>
          </div>

          {product.prepMinutes > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Tiempo de preparación: {product.prepMinutes} min</span>
            </div>
          )}

          {product.description ? (
            <div>
              <h2 className="mb-1.5 text-sm font-semibold">Descripción</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
            </div>
          ) : null}

          {product.tags && product.tags.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold">Etiquetas</h2>
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {!product.available && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-center text-sm font-medium text-destructive">
              Este producto no está disponible en este momento
            </div>
          )}
        </motion.div>
      </div>

      {/* Sticky bottom CTA */}
      {product.available && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 px-4 py-4 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            {qty > 0 ? (
              <div className="flex flex-1 items-center justify-between rounded-xl border border-border px-3 py-2">
                <button
                  onClick={() => decrement(product.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted transition-colors hover:bg-muted/80"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-lg font-bold">{qty}</span>
                <button
                  onClick={() => increment(product.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted transition-colors hover:bg-muted/80"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <Button
              className="flex-1"
              size="lg"
              onClick={() => {
                if (qty === 0) add(product);
                else increment(product.id);
              }}
            >
              {qty === 0 ? (
                <><Plus className="mr-2 h-5 w-5" /> Agregar al carrito · {formatCurrency(product.price)}</>
              ) : (
                <><ShoppingBag className="mr-2 h-5 w-5" /> Ver carrito ({qty} en carrito)</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
