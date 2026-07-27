"use client";

import { use, useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ShoppingBag,
  Plus,
  Minus,
  Star,
  Check,
  ArrowLeft,
  Trash2,
  Search,
  Send,
  Loader2,
} from "lucide-react";
import type { Product } from "@/types";
import { Icon } from "@/components/shared/icon";
import { ProductImage } from "@/components/shared/product-image";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useWebStore } from "@/store/web.store";
import { useAppStore } from "@/store/app.store";
import { MyOrdersSheet } from "@/components/website/my-orders-sheet";
import { useAsync } from "@/hooks/use-async";
import { publicService, type PublicOrderResult } from "@/services/public.service";
import { cn, formatCurrency } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

export default function RestaurantSitePage(props: { params: Promise<{ slug: string }> }) {
  // useSearchParams requiere boundary Suspense en build estático.
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <RestaurantSiteInner {...props} />
    </Suspense>
  );
}

function RestaurantSiteInner({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const searchParams = useSearchParams();
  // Backlog #8: QR por mesa — el parámetro ?table=N indica la mesa escaneada.
  const tableFromQR = searchParams.get("table");
  const tableNumber = tableFromQR ? Number(tableFromQR) : null;
  // "Ver carrito" desde el detalle del producto vuelve con ?cart=1 para abrir el Sheet.
  const openCartOnLoad = searchParams.get("cart") === "1";

  // Carta pública: SIEMPRE por el endpoint sin autenticación. El cliente que
  // escanea el QR no tiene sesión, así que no puede usar /admin/tenants/ ni
  // /menu/products/ (ambos 401). /public/<slug>/menu/ trae restaurante,
  // categorías, productos disponibles y mesas en una sola llamada.
  const currentRestaurant = useAppStore((s) => s.restaurant);
  const { data: menu, loading } = useAsync(() => publicService.getMenu(slug), [slug]);

  const tenant = menu?.restaurant;
  const categories = useMemo(() => menu?.categories ?? [], [menu]);
  const products = useMemo(() => (menu?.products ?? []) as unknown as Product[], [menu]);

  const { cart, add, increment, decrement } = useWebStore();

  const MENU_CATEGORIES = useMemo(
    () => [{ id: "popular", name: "Popular", icon: "Star" }, ...categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))],
    [categories]
  );
  const [activeCat, setActiveCat] = useState("popular");
  const [query, setQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(openCartOnLoad);
  const [checkout, setCheckout] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [placing, setPlacing] = useState(false);

  const count = cart.reduce((s, l) => s + l.quantity, 0);
  const total = cart.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const qtyOf = (id: string) => cart.find((l) => l.product.id === id)?.quantity ?? 0;

  const visible = useMemo(() => {
    if (query.trim()) {
      return products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
    }
    if (activeCat === "popular") {
      // Si el restaurante no marcó destacados, mostrar toda la carta en vez de
      // dejar la pantalla vacía al cliente que acaba de escanear el QR.
      const populars = products.filter((p) => p.popular);
      return populars.length > 0 ? populars : products;
    }
    return products.filter((p) => String(p.category) === String(activeCat));
  }, [products, query, activeCat]);

  const placeOrder = async () => {
    if (cart.length === 0) {
      toast.error("Tu carrito está vacío");
      return;
    }
    setPlacing(true);
    try {
      // Pedido web directo a cocina (sin pago). Se asocia a la mesa del QR y
      // envía las notas por item. El backend lo emite al KDS vía WebSocket.
      const result: PublicOrderResult = await publicService.createOrder(slug, {
        table: tableNumber,
        items: cart.map((l) => ({
          productId: Number(l.product.id),
          quantity: l.quantity,
          notes: l.notes?.trim() || undefined,
        })),
        customer: name.trim() || "Cliente web",
      });
      setDoneId(result.orderId);
      setCheckout(false);
      setCartOpen(false);
      // Registra el pedido para poder seguirlo en 'Mis pedidos'.
      useWebStore.getState().addMyOrder(result.orderId);
      // Limpia el carrito tras enviar al backend real.
      useWebStore.getState().clear();
    } catch (err) {
      toast.error("No se pudo enviar el pedido", {
        description: err instanceof Error ? err.message.slice(0, 100) : "Intenta de nuevo",
      });
    } finally {
      setPlacing(false);
    }
  };

  if (!tenant) {
    if (loading) {
      return (
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      );
    }
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-background px-4 text-center">
        <p className="text-lg font-bold">Restaurante no encontrado</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          No encontramos ningún restaurante con la dirección “{slug}”. Verifica el enlace o el código QR.
        </p>
        <Link href="/" className="mt-2 text-sm font-medium text-primary hover:underline">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const bannerUrl = currentRestaurant.slug === slug ? currentRestaurant.banner : "";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <header className="z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 lg:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-orange-500 text-lg shadow">
            {tenant.logo}
          </div>
          <p className="text-base font-black uppercase tracking-tight">{tenant.name}</p>
        </div>

        <div className="relative mx-auto hidden w-full max-w-md md:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Buscar plato…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-full border border-border bg-muted/50 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            href="/"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:flex sm:items-center sm:gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> POS
          </Link>
          <ThemeToggle />
          <MyOrdersSheet />
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button className="rounded-full px-4">
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">Carrito</span> ({count})
              </Button>
            </SheetTrigger>
            <CartSheet
              cart={cart}
              total={total}
              checkout={checkout}
              restaurantName={tenant.name}
              name={name}
              setName={setName}
              tableNumber={tableNumber}
              placing={placing}
              onCheckout={() => setCheckout(true)}
              onBack={() => setCheckout(false)}
              onPlace={placeOrder}
              increment={increment}
              decrement={decrement}
              setNotes={useWebStore.getState().setNotes}
            />
          </Sheet>
        </div>
      </header>

      {/* Banner hero */}
      {bannerUrl && (
        <div className="relative h-36 w-full shrink-0 overflow-hidden sm:h-48">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bannerUrl} alt={`${tenant.name} banner`} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background/90 text-2xl shadow-lg backdrop-blur">
              {tenant.logo}
            </div>
            <div>
              <p className="text-lg font-black text-white drop-shadow-lg">{tenant.name}</p>
              <p className="text-xs text-white/80 drop-shadow">Pedidos en línea</p>
            </div>
          </div>
        </div>
      )}

      {/* Búsqueda móvil */}
      <div className="border-b border-border p-3 md:hidden">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Buscar plato…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-full border border-border bg-muted/50 pl-10 pr-4 text-sm outline-none focus:border-primary focus:bg-background"
          />
        </div>
      </div>

      {/* Backlog #8: banner de mesa escaneada por QR */}
      {tableNumber && (
        <div className="flex items-center gap-2 border-b border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {tableNumber}
          </span>
          <span className="font-medium">Pedido para la Mesa {tableNumber}</span>
          <span className="text-muted-foreground">· se enviará directo a cocina</span>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Rail de categorías (desktop) */}
        <aside className="scrollbar-thin hidden w-24 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border py-3 lg:flex">
          {MENU_CATEGORIES.map((c) => {
            const active = activeCat === c.id && !query;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setActiveCat(c.id);
                  setQuery("");
                }}
                className={cn(
                  "mx-2 flex flex-col items-center gap-1.5 rounded-xl py-3 text-[11px] font-medium transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                    active ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  <Icon name={c.icon} className="h-5 w-5" />
                </span>
                {c.name}
              </button>
            );
          })}
        </aside>

        {/* Contenido */}
        <main className="scrollbar-thin min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Categorías (móvil) */}
          <div className="scrollbar-thin -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
            {MENU_CATEGORIES.map((c) => {
              const active = activeCat === c.id && !query;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveCat(c.id);
                    setQuery("");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  )}
                >
                  <Icon name={c.icon} className="h-4 w-4" />
                  {c.name}
                </button>
              );
            })}
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-bold">
              {query ? `Resultados: “${query}”` : MENU_CATEGORIES.find((c) => c.id === activeCat)?.name}
            </h1>
            <span className="text-sm text-muted-foreground">{visible.length} platos</span>
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center text-muted-foreground">
              <Search className="mb-3 h-10 w-10" />
              <p>No encontramos platos para tu búsqueda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 pb-24 sm:grid-cols-2 xl:grid-cols-3 lg:pb-6">
              {visible.map((p, i) => (
                <MenuCard
                  key={p.id}
                  product={p}
                  qty={qtyOf(p.id)}
                  index={i}
                  slug={slug}
                  onAdd={() => {
                    add(p);
                    toast.success(`${p.name} añadido`);
                  }}
                  onInc={() => increment(p.id)}
                  onDec={() => decrement(p.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Barra flotante de carrito (móvil) */}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 p-3 backdrop-blur-md lg:hidden"
          >
            <Button className="h-12 w-full justify-between text-base" onClick={() => setCartOpen(true)}>
              <span className="flex items-center gap-2">
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary-foreground/20 px-1.5 text-sm">
                  {count}
                </span>
                Ver mi pedido
              </span>
              <span>{formatCurrency(total)}</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmación */}
      <AnimatePresence>
        {doneId && <OrderConfirmation orderId={doneId} onClose={() => setDoneId(null)} />}
      </AnimatePresence>

      {/* Backlog #8: estado del pedido web en vivo (cuando viene del backend) */}
      <AnimatePresence>
        {doneId && <LiveOrderStatus orderId={doneId} />}
      </AnimatePresence>
    </div>
  );
}

const STATUS_FLOW: Record<string, { label: string; color: string }> = {
  pending: { label: "En cola", color: "bg-amber-500" },
  preparing: { label: "Preparando", color: "bg-sky-500" },
  ready: { label: "Listo para servir", color: "bg-emerald-500" },
  served: { label: "Servido", color: "bg-emerald-600" },
  paid: { label: "Completado", color: "bg-zinc-500" },
};

/** Estado del pedido web en vivo, consultando el endpoint público (backlog #8). */
function LiveOrderStatus({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<
    { code: string; status: string; estimatedWait: number; table: number | null } | null
  >(null);
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const s = await publicService.getStatus(orderId);
        if (alive) setStatus({ code: s.code, status: s.status, estimatedWait: s.estimatedWait, table: s.table });
      } catch { /* ignora: puede ser un id mock local */ }
    };
    poll();
    // Sondeo corto: el cliente ve el avance de cocina casi en vivo.
    const t = setInterval(poll, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [orderId]);

  if (!status) return null;
  const info = STATUS_FLOW[status.status] ?? { label: status.status, color: "bg-muted" };
  const done = status.status === "ready" || status.status === "served";
  // Visible también en móvil: es el dispositivo con el que se escanea el QR.
  return (
    <div className="fixed inset-x-3 bottom-3 z-40 rounded-xl border border-border bg-card p-3 shadow-lg lg:inset-x-auto lg:right-4 lg:max-w-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">
          Tu pedido <span className="font-mono">{status.code}</span>
          {status.table != null && <span className="text-muted-foreground"> · Mesa {status.table}</span>}
        </p>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white", info.color)}>
          {info.label}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", info.color, !done && "animate-pulse")} />
        <span className="text-sm text-muted-foreground">
          {done ? "¡Tu pedido está listo!" : `Tiempo estimado: ~${status.estimatedWait} min`}
        </span>
      </div>
    </div>
  );
}

function MenuCard({
  product: p,
  qty,
  index,
  slug,
  onAdd,
  onInc,
  onDec,
}: {
  product: Product;
  qty: number;
  index: number;
  slug: string;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index % 9) * 0.03 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md",
        qty > 0 ? "border-primary/50 ring-1 ring-primary/20" : "border-border",
        !p.available && "opacity-60"
      )}
    >
      {/* Imagen + info — clickeable abre el detalle del producto */}
      <Link href={`/restaurant/${slug}/product/${p.id}`} className="block">
        <div className="relative h-36 w-full overflow-hidden sm:h-40">
          <ProductImage emoji={p.image} category={p.category} size="lg" className="h-full w-full rounded-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          {p.popular && (
            <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950">
              <Star className="h-3 w-3 fill-current" /> Popular
            </span>
          )}
          {!p.available && (
            <span className="absolute right-2.5 top-2.5 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Agotado
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 p-3 pr-14">
            <p className="line-clamp-1 font-semibold text-white drop-shadow-sm">{p.name}</p>
            <p className="text-sm font-bold text-white/90">{formatCurrency(p.price)}</p>
          </div>
        </div>
      </Link>

      {/* Acción: botón independiente (fuera del Link) para no navegar al detalle.
          stopPropagation evita que el clic burbulee al Link si se solapan. */}
      {p.available && (
        <div className="absolute bottom-3 right-3">
          {qty > 0 ? (
            <div className="flex items-center gap-1 rounded-full bg-background/95 p-0.5 shadow-lg backdrop-blur">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDec(); }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-primary hover:bg-primary/10"
                aria-label="Quitar uno"
              >
                {qty === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
              </button>
              <span className="w-5 text-center text-sm font-bold">{qty}</span>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onInc(); }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-primary hover:bg-primary/10"
                aria-label="Agregar uno"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAdd(); }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 active:scale-95"
              aria-label={`Añadir ${p.name}`}
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

function CartSheet({
  cart,
  total,
  checkout,
  restaurantName,
  name,
  setName,
  tableNumber,
  placing,
  onCheckout,
  onBack,
  onPlace,
  increment,
  decrement,
  setNotes,
}: any) {
  return (
    <SheetContent className="flex flex-col gap-0 p-0">
      <SheetHeader className="border-b border-border">
        <SheetTitle className="flex items-center gap-2">
          {checkout && (
            <button onClick={onBack} className="rounded-md p-1 hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          {checkout ? "Confirmar pedido" : "Tu carrito"}
        </SheetTitle>
      </SheetHeader>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center text-muted-foreground">
            <ShoppingBag className="mb-3 h-10 w-10" />
            <p className="text-sm">Tu carrito está vacío</p>
          </div>
        ) : checkout ? (
          <div className="space-y-4">
            {/* Mesa del QR (si aplica) */}
            {tableNumber && (
              <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {tableNumber}
                </span>
                <span className="font-medium">Pedido para Mesa {tableNumber}</span>
              </div>
            )}

            {/* Nombre opcional */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Tu nombre (opcional)</label>
              <Input
                placeholder="¿A nombre de quién?"
                value={name}
                onChange={(e: any) => setName(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Para que el mesero sepa a quién entregar.</p>
            </div>

            {/* Resumen con notas por item */}
            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-sm font-semibold">Tu pedido</p>
              <div className="space-y-3">
                {cart.map((l: any) => (
                  <div key={l.product.id} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{l.quantity}× {l.product.name}</span>
                      <span>{formatCurrency(l.product.price * l.quantity)}</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Notas (ej. sin cebolla, término medio…)"
                      value={l.notes ?? ""}
                      onChange={(e) => setNotes(l.product.id, e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t border-border pt-2 text-sm font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
              <p>El pedido se <strong className="text-foreground">envía directo a cocina</strong>. El pago se realiza al recibir en {restaurantName}.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((l: any) => (
              <div key={l.product.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <ProductImage emoji={l.product.image} category={l.product.category} size="sm" className="h-12 w-12 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.product.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(l.product.price)}</p>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-border">
                  <button onClick={() => decrement(l.product.id)} className="flex h-7 w-7 items-center justify-center hover:bg-muted">
                    {l.quantity === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                  </button>
                  <span className="w-5 text-center text-sm font-semibold">{l.quantity}</span>
                  <button onClick={() => increment(l.product.id)} className="flex h-7 w-7 items-center justify-center hover:bg-muted">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-bold">{formatCurrency(total)}</span>
          </div>
          {checkout ? (
            <Button className="w-full" size="lg" onClick={onPlace} disabled={placing}>
              {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {placing ? "Enviando a cocina…" : "Enviar a cocina"}
            </Button>
          ) : (
            <Button className="w-full" size="lg" onClick={onCheckout}>
              Confirmar pedido
            </Button>
          )}
        </div>
      )}
    </SheetContent>
  );
}

function OrderConfirmation({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  // Estado en vivo del pedido consultando el endpoint público.
  const [status, setStatus] = useState<{ code: string; status: string; table: number | null; estimatedWait: number; items: { name: string; quantity: number }[] } | null>(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const s = await publicService.getStatus(orderId);
        if (alive) setStatus({ code: s.code, status: s.status, table: s.table, estimatedWait: s.estimatedWait, items: s.items });
      } catch { /* id mock local o error de red: se queda sin estado */ }
    };
    poll();
    const t = setInterval(poll, 8000);
    return () => { alive = false; clearInterval(t); };
  }, [orderId]);

  const STATUS_INFO: Record<string, { label: string; color: string; emoji: string }> = {
    pending: { label: "En cola", color: "bg-amber-500", emoji: "⏳" },
    preparing: { label: "Preparando", color: "bg-sky-500", emoji: "👨‍🍳" },
    ready: { label: "Listo para servir", color: "bg-emerald-500", emoji: "✅" },
    served: { label: "Servido", color: "bg-emerald-600", emoji: "🍽️" },
    paid: { label: "Completado", color: "bg-zinc-500", emoji: "🎉" },
  };
  const info = (status && STATUS_INFO[status.status]) || { label: status?.status || "Pendiente", color: "bg-muted", emoji: "⏳" };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 12 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 16 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success"
        >
          <Check className="h-9 w-9" />
        </motion.div>
        <h3 className="text-lg font-bold">¡Pedido enviado a cocina!</h3>
        {status ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Orden <span className="font-mono font-semibold text-foreground">{status.code}</span>
              {status.table ? <> · Mesa {status.table}</> : null}
            </p>

            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-muted/60 px-3 py-2.5">
              <span className="text-xl">{info.emoji}</span>
              <span className="text-sm font-semibold">{info.label}</span>
              <span className={cn("ml-1 h-2 w-2 animate-pulse rounded-full", info.color)} />
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Tiempo de espera estimado: <strong className="text-foreground">~{status.estimatedWait} min</strong>
            </p>

            {status.items.length > 0 && (
              <div className="mt-4 rounded-xl border border-border p-3 text-left">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tu pedido</p>
                {status.items.map((it, i) => (
                  <div key={i} className="flex justify-between py-0.5 text-sm">
                    <span className="text-muted-foreground">{it.name}</span>
                    <span>{it.quantity}×</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Tu pedido fue registrado. Cocina lo preparará en breve.</p>
        )}

        <Button className="mt-5 w-full" onClick={onClose}>
          Hacer otro pedido
        </Button>
      </motion.div>
    </motion.div>
  );
}
