"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Plus, Search, ShoppingCart } from "lucide-react";
import type { Product } from "@/types";
import { useMenuStore } from "@/store/menu.store";
import { Icon } from "@/components/shared/icon";
import { ProductImage } from "@/components/shared/product-image";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderPanel } from "@/components/orders/order-panel";
import { ModifierDialog } from "@/components/orders/modifier-dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useOrderStore, orderSelectors } from "@/store/order.store";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";

/** Categoría comodín: muestra toda la carta. */
const ALL = "all";

export default function OrdersPage() {
  const categories = useMenuStore((s) => s.categories);
  const products = useMenuStore((s) => s.products);
  const addProduct = useOrderStore((s) => s.addProduct);

  const [mounted, setMounted] = useState(false);
  // "Todos" por defecto: el valor anterior era el id de una categoría de
  // ejemplo ("entradas"), así que en un restaurante real no coincidía con
  // ninguna y la pantalla arrancaba vacía sin explicar por qué.
  const [activeCat, setActiveCat] = useState(ALL);
  const [query, setQuery] = useState("");
  const [modProduct, setModProduct] = useState<Product | null>(null);
  const [modOpen, setModOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const lines = useOrderStore((s) => s.lines);
  const cartCount = orderSelectors.count(lines);
  const cartTotal = orderSelectors.subtotal(lines);

  useEffect(() => setMounted(true), []);
  const loading = !mounted;

  // Si la categoría activa desaparece (se borró, o cambió el restaurante) se
  // vuelve a "Todos" en vez de dejar la carta en blanco.
  useEffect(() => {
    if (activeCat !== ALL && categories.length > 0 && !categories.some((c) => c.id === activeCat)) {
      setActiveCat(ALL);
    }
  }, [categories, activeCat]);

  const visible = useMemo(() => {
    return products.filter((p) =>
      query
        ? p.name.toLowerCase().includes(query.toLowerCase())
        : activeCat === ALL || p.category === activeCat
    );
  }, [products, activeCat, query]);

  const pickCategory = (id: string) => {
    setActiveCat(id);
    setQuery("");
  };

  const handleAdd = (p: Product) => {
    if (!p.available) return;
    setModProduct(p);
    setModOpen(true);
  };

  return (
    <div className="grid h-[calc(100vh-7rem)] grid-cols-1 gap-4 lg:grid-cols-[200px_1fr_360px]">
      {/* Categorías */}
      <div className="hidden flex-col gap-1.5 lg:flex">
        <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Categorías
        </p>
        <button
          onClick={() => pickCategory(ALL)}
          className={cn(
            "flex items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors",
            activeCat === ALL && !query ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
          )}
        >
          <Icon name="LayoutGrid" className="h-5 w-5" />
          <span className="flex-1">Todos</span>
          <span className="text-xs text-muted-foreground">{products.length}</span>
        </button>
        {categories?.map((c) => (
          <button
            key={c.id}
            onClick={() => pickCategory(c.id)}
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
        {/* En móvil la barra lateral de categorías está oculta y no había forma
            de filtrar la carta: aquí van como fichas deslizables. */}
        <div className="scrollbar-thin flex gap-2 overflow-x-auto border-b border-border p-3 lg:hidden">
          <CatChip
            label="Todos"
            icon="LayoutGrid"
            count={products.length}
            active={activeCat === ALL && !query}
            onClick={() => pickCategory(ALL)}
          />
          {categories?.map((c) => (
            <CatChip
              key={c.id}
              label={c.name}
              icon={c.icon}
              count={c.count}
              active={activeCat === c.id && !query}
              onClick={() => pickCategory(c.id)}
            />
          ))}
        </div>

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
        <div className="scrollbar-thin grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-3 pb-28 sm:grid-cols-3 lg:pb-3 xl:grid-cols-4">
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
                    // Sin overflow-hidden: en un elemento de rejilla convierte
                    // la fila en una sola línea de alto y la tarjeta salía
                    // recortada, sin nombre ni precio. Las esquinas las redondea
                    // la propia imagen.
                    "group relative flex flex-col rounded-xl border border-border bg-background text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                    !p.available && "cursor-not-allowed opacity-50"
                  )}
                >
                  {/* shrink-0: dentro de una columna flex la imagen se encogía
                      cuando la tarjeta se quedaba sin alto, y el nombre y el
                      precio quedaban cortados a media línea. */}
                  <ProductImage emoji={p.image} category={p.category} className="h-24 w-full shrink-0 rounded-b-none rounded-t-xl" />
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
                  {/* grow con base automática: `flex-1` parte de 0 y colapsaba
                      el bloque entero al primer apretón de espacio. */}
                  <div className="flex shrink-0 grow basis-auto flex-col p-2.5">
                    {/* El nombre completo: "Aguardiente Antioqueño sin azúcar"
                        y "Aguardiente Antioqueño tradicional" se veían iguales
                        recortados a una línea. */}
                    <p className="text-sm font-semibold leading-tight [overflow-wrap:anywhere]" title={p.name}>
                      {p.name}
                    </p>
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

      {/* El panel del pedido también está oculto bajo lg: sin esto se pueden
          añadir productos en el móvil pero no verlos ni enviarlos a cocina. */}
      {cartCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-4 bottom-24 z-40 flex items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-lg lg:hidden"
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="text-sm font-semibold">
            {cartCount} {cartCount === 1 ? "ítem" : "ítems"}
          </span>
          <span className="ml-auto text-sm font-bold">{formatCurrency(cartTotal)}</span>
        </button>
      )}

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="h-[85vh] p-0">
          <SheetTitle className="sr-only">Pedido actual</SheetTitle>
          <OrderPanel />
        </SheetContent>
      </Sheet>

      <ModifierDialog product={modProduct} open={modOpen} onOpenChange={setModOpen} />
    </div>
  );
}

/** Ficha de categoría para la fila deslizable del móvil. */
function CatChip({
  label,
  icon,
  count,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
      )}
    >
      <Icon name={icon} className="h-4 w-4" />
      {label}
      {count != null && <span className="text-xs text-muted-foreground">{count}</span>}
    </button>
  );
}
