"use client";

import { use, useEffect, useMemo, useState } from "react";
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
  Upload,
  Phone,
  Loader2,
} from "lucide-react";
import type { PaymentMethod, Product } from "@/types";
import { Icon } from "@/components/shared/icon";
import { ProductImage } from "@/components/shared/product-image";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useWebStore } from "@/store/web.store";
import { useMenuStore } from "@/store/menu.store";
import { useAppStore } from "@/store/app.store";
import { MyOrdersSheet } from "@/components/website/my-orders-sheet";
import { useAsync } from "@/hooks/use-async";
import { saasService } from "@/services/saas.service";
import { cn, formatCurrency } from "@/lib/utils";

export default function RestaurantSitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  // El tenant actualmente logueado ya conoce su propio restaurante (evita ir a red).
  const currentRestaurant = useAppStore((s) => s.restaurant);
  const { data: tenants, loading } = useAsync(() => saasService.getTenants().catch(() => []), []);
  const tenant =
    currentRestaurant.slug === slug
      ? currentRestaurant
      : tenants?.find((t) => t.slug === slug);

  const { cart, add, increment, decrement, submitOrder } = useWebStore();
  const categories = useMenuStore((s) => s.categories);
  const products = useMenuStore((s) => s.products);
  const loadMenu = useMenuStore((s) => s.load);

  useEffect(() => {
    if (products.length === 0) loadMenu();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const MENU_CATEGORIES = useMemo(
    () => [{ id: "popular", name: "Popular", icon: "Star" }, ...categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))],
    [categories]
  );
  const [activeCat, setActiveCat] = useState("popular");
  const [query, setQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("nequi");

  const count = cart.reduce((s, l) => s + l.quantity, 0);
  const total = cart.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const qtyOf = (id: string) => cart.find((l) => l.product.id === id)?.quantity ?? 0;

  const visible = useMemo(() => {
    if (query.trim()) {
      return products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
    }
    if (activeCat === "popular") return products.filter((p) => p.popular);
    return products.filter((p) => p.category === activeCat);
  }, [products, query, activeCat]);

  const placeOrder = () => {
    if (!phone.trim() || phone.replace(/\D/g, "").length < 7) {
      toast.error("Ingresa un número de teléfono válido");
      return;
    }
    const order = submitOrder(name || "Cliente web", phone.trim(), method);
    setDoneId(order.id);
    setCheckout(false);
    setCartOpen(false);
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
              phone={phone}
              setPhone={setPhone}
              method={method}
              setMethod={setMethod}
              onCheckout={() => setCheckout(true)}
              onBack={() => setCheckout(false)}
              onPlace={placeOrder}
              increment={increment}
              decrement={decrement}
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
      {/* Imagen — clickeable abre detalle */}
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
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="line-clamp-1 font-semibold text-white drop-shadow-sm">{p.name}</p>
          <p className="text-sm font-bold text-white/90">{formatCurrency(p.price)}</p>
        </div>

        {/* Acción */}
        <div className="absolute bottom-3 right-3">
          {!p.available ? null : qty > 0 ? (
            <div className="flex items-center gap-1 rounded-full bg-background/95 p-0.5 shadow-lg backdrop-blur">
              <button onClick={onDec} className="flex h-7 w-7 items-center justify-center rounded-full text-primary hover:bg-primary/10">
                {qty === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
              </button>
              <span className="w-5 text-center text-sm font-bold">{qty}</span>
              <button onClick={onInc} className="flex h-7 w-7 items-center justify-center rounded-full text-primary hover:bg-primary/10">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onAdd}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 active:scale-95"
              aria-label={`Añadir ${p.name}`}
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      </Link>
    </motion.div>
  );
}

const WEB_METHODS: { id: PaymentMethod; label: string; emoji: string }[] = [
  { id: "nequi", label: "Nequi", emoji: "💜" },
  { id: "daviplata", label: "Daviplata", emoji: "❤️" },
  { id: "cash", label: "Efectivo", emoji: "💵" },
];

function CartSheet({
  cart,
  total,
  checkout,
  restaurantName,
  name,
  setName,
  phone,
  setPhone,
  method,
  setMethod,
  onCheckout,
  onBack,
  onPlace,
  increment,
  decrement,
}: any) {
  const freeShipping = total >= 40000;
  const isTransfer = method !== "cash";
  return (
    <SheetContent className="flex flex-col gap-0 p-0">
      <SheetHeader className="border-b border-border">
        <SheetTitle className="flex items-center gap-2">
          {checkout && (
            <button onClick={onBack} className="rounded-md p-1 hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          {checkout ? "Finalizar pedido" : "Tu carrito"}
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
            <div>
              <label className="mb-1.5 block text-sm font-medium">Nombre</label>
              <Input placeholder="¿A nombre de quién?" value={name} onChange={(e: any) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Teléfono <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="300 123 4567"
                  value={phone}
                  onChange={(e: any) => setPhone(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Lo usamos para confirmar y coordinar tu entrega.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Dirección de entrega</label>
              <Input placeholder="Calle 10 #43-21, apto 502" defaultValue="Calle 10 #43-21" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Método de pago</label>
              <div className="grid grid-cols-3 gap-2">
                {WEB_METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors",
                      method === m.id ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
                    )}
                  >
                    <span className="block text-base">{m.emoji}</span>
                    {m.label}
                  </button>
                ))}
              </div>
              {isTransfer && (
                <div className="mt-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2.5 text-xs">
                  <p className="font-medium text-foreground">Transfiere a:</p>
                  <p className="text-muted-foreground">
                    {method === "nequi" ? "Nequi" : "Daviplata"} · <span className="font-semibold text-foreground">300 245 1188</span> · {restaurantName}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">Sube el comprobante al confirmar el pedido. 📸</p>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-sm font-semibold">Resumen</p>
              {cart.map((l: any) => (
                <div key={l.product.id} className="flex justify-between py-0.5 text-sm text-muted-foreground">
                  <span>
                    {l.quantity}× {l.product.name}
                  </span>
                  <span>{formatCurrency(l.product.price * l.quantity)}</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm">
                <span className="text-muted-foreground">Envío</span>
                <span className={cn("font-medium", freeShipping ? "text-emerald-500" : "")}>
                  {freeShipping ? "Gratis" : formatCurrency(5900)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {!freeShipping && (
              <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-xs text-muted-foreground">
                Te faltan <span className="font-semibold text-primary">{formatCurrency(40000 - total)}</span> para
                obtener <span className="font-semibold text-foreground">envío gratis</span> 🚀
              </div>
            )}
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
            <Button className="w-full" size="lg" onClick={onPlace}>
              Confirmar pedido · {formatCurrency(total)}
            </Button>
          ) : (
            <Button className="w-full" size="lg" onClick={onCheckout}>
              Continuar al pago
            </Button>
          )}
        </div>
      )}
    </SheetContent>
  );
}

function OrderConfirmation({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const order = useWebStore((s) => s.liveOrders.find((o) => o.id === orderId));
  const uploadReceipt = useWebStore((s) => s.uploadReceipt);
  const [uploading, setUploading] = useState(false);

  if (!order) return null;
  const needsReceipt = order.status === "awaiting_receipt";

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      uploadReceipt(orderId, String(reader.result));
      setUploading(false);
      toast.success("Comprobante recibido", { description: "El restaurante verificará tu pago." });
    };
    reader.readAsDataURL(file);
  };

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
        <h3 className="text-lg font-bold">¡Pedido recibido!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu orden <span className="font-semibold text-foreground">{order.code}</span> fue registrada para{" "}
          <span className="font-semibold text-foreground">{order.phone}</span>.
        </p>

        {needsReceipt ? (
          <div className="mt-5 text-left">
            <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5">
              <p className="text-center text-sm font-bold text-destructive">
                SIN COMPROBANTE TU PEDIDO NO SERA PROCESADO
              </p>
              <p className="mt-0.5 text-center text-xs text-destructive/80">
                El restaurante requiere evidencia del pago para despachar tu orden.
              </p>
            </div>
            <p className="mb-2 text-sm font-semibold">Sube tu comprobante de pago</p>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary bg-primary/5 p-6 text-center transition-colors hover:border-primary hover:bg-primary/10">
              {uploading ? (
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              ) : (
                <Upload className="h-7 w-7 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{uploading ? "Subiendo…" : "Tomar foto o elegir imagen"}</span>
              <span className="text-xs text-muted-foreground">JPG o PNG · transferencia o recibo</span>
              <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={uploading} />
            </label>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              El administrador verificará el pago antes de despachar.
            </p>
          </div>
        ) : (
          <>
            {order.receipt && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={order.receipt}
                alt="Comprobante"
                className="mx-auto mt-4 max-h-40 rounded-xl border border-border object-contain"
              />
            )}
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-600 dark:text-amber-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              Comprobante en revisión por el restaurante
            </div>
          </>
        )}

        {needsReceipt && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Si cierras sin subir el comprobante, deberás contactar directamente al restaurante
            para que procesen tu pedido manualmente.
          </p>
        )}
        <Button
          className="mt-2 w-full"
          variant={needsReceipt ? "ghost" : "default"}
          size={needsReceipt ? "sm" : "default"}
          onClick={onClose}
        >
          {needsReceipt ? "Cerrar de todas formas (pedido en riesgo)" : "Seguir explorando"}
        </Button>
      </motion.div>
    </motion.div>
  );
}
