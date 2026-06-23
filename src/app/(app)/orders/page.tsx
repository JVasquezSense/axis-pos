"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Plus, Search } from "lucide-react";
import type { Product } from "@/types";
import { useMenuStore } from "@/store/menu.store";
import { Icon } from "@/components/shared/icon";
import { ProductImage } from "@/components/shared/product-image";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderPanel } from "@/components/orders/order-panel";
import { ModifierDialog } from "@/components/orders/modifier-dialog";
import { useOrderStore } from "@/store/order.store";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";

export default function OrdersPage() {
  const categories = useMenuStore((s) => s.categories);
  const products = useMenuStore((s) => s.products);
  const addProduct = useOrderStore((s) => s.addProduct);

  const [mounted, setMounted] = useState(false);
  const [activeCat, setActiveCat] = useState("entradas");
  const [query, setQuery] = useState("");
  const [modProduct, setModProduct] = useState<Product | null>(null);
  const [modOpen, setModOpen] = useState(false);

  useEffect(() => setMounted(true), []);
  const loading = !mounted;

  const visible = useMemo(() => {
    return products.filter(
      (p) =>
        (query ? p.name.toLowerCase().includes(query.toLowerCase()) : p.category === activeCat)
    );
  }, [products, activeCat, query]);

  const handleAdd = (p: Product) => {
    if (!p.available) return;
    if (p.modifiers?.length) {
      setModProduct(p);
      setModOpen(true);
    } else {
      addProduct(p);
      toast.success(`${p.name} agregado`);
    }
  };

  return (
    <div className="grid h-[calc(100vh-7rem)] grid-cols-1 gap-4 lg:grid-cols-[200px_1fr_360px]">
      {/* Categorías */}
      <div className="hidden flex-col gap-1.5 lg:flex">
        <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Categorías
        </p>
        {categories?.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setActiveCat(c.id);
              setQuery("");
            }}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors",
              activeCat === c.id && !query
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:bg-muted"
            )}
          >
            <Icon name={c.icon} className="h-5 w-5" />
            <span className="flex-1">{c.name}</span>
            <span className="text-xs text-muted-foreground">{c.count}</span>
          </button>
        )) ?? <Skeleton className="h-64 w-full" />}
      </div>

      {/* Productos */}
      <div className="flex min-h-0 flex-col rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar producto en el menú…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-muted/40 pl-9 pr-3 text-sm outline-none focus:border-primary focus:bg-background"
            />
          </div>
        </div>
        <div className="scrollbar-thin grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-3 sm:grid-cols-3 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)
            : visible.map((p, i) => (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => handleAdd(p)}
                  disabled={!p.available}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-background text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                    !p.available && "cursor-not-allowed opacity-50"
                  )}
                >
                  <ProductImage emoji={p.image} category={p.category} className="h-24 w-full rounded-b-none" />
                  {p.popular && (
                    <Badge className="absolute left-2 top-2" variant="warning">
                      ★ Popular
                    </Badge>
                  )}
                  {!p.available && (
                    <span className="absolute right-2 top-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Agotado
                    </span>
                  )}
                  <div className="flex flex-1 flex-col p-2.5">
                    <p className="line-clamp-1 text-sm font-semibold">{p.name}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{p.description}</p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="text-sm font-bold">{formatCurrency(p.price)}</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        <Plus className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </motion.button>
              ))}
        </div>
      </div>

      {/* Pedido */}
      <div className="hidden min-h-0 rounded-2xl border border-border bg-card lg:block">
        <OrderPanel />
      </div>

      <ModifierDialog product={modProduct} open={modOpen} onOpenChange={setModOpen} />
    </div>
  );
}
