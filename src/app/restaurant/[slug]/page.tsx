"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ShoppingBag,
  Plus,
  Minus,
  Star,
  Clock,
  MapPin,
  Check,
  ArrowLeft,
  Trash2,
  BadgePercent,
  ShieldCheck,
  Bike,
  ChevronDown,
  Upload,
  Phone,
  Loader2,
} from "lucide-react";
import type { PaymentMethod } from "@/types";
import { CATEGORIES, PRODUCTS } from "@/mock/menu";
import { ProductImage } from "@/components/shared/product-image";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useWebStore } from "@/store/web.store";
import { cn, formatCurrency } from "@/lib/utils";

export default function RestaurantSitePage() {
  const { cart, add, increment, decrement, submitOrder } = useWebStore();
  const [activeCat, setActiveCat] = useState(CATEGORIES[0].id);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("nequi");

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const navRef = useRef<HTMLDivElement>(null);

  const count = cart.reduce((s, l) => s + l.quantity, 0);
  const total = cart.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const qtyOf = (id: string) => cart.find((l) => l.product.id === id)?.quantity ?? 0;

  const popular = useMemo(() => PRODUCTS.filter((p) => p.popular), []);
  const grouped = useMemo(
    () => CATEGORIES.map((c) => ({ category: c, items: PRODUCTS.filter((p) => p.category === c.id) })),
    []
  );

  // Scroll-spy: resalta la categoría visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveCat(visible.target.id.replace("cat-", ""));
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollToCat = (id: string) => {
    setActiveCat(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Centra la pastilla activa en la barra
    navRef.current?.querySelector(`[data-cat="${id}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

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

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {/* Anuncio */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-medium">
          <BadgePercent className="h-3.5 w-3.5" />
          Envío gratis en pedidos sobre $40.000 · Usa el código <span className="font-bold">AXIS10</span> y ahorra 10%
        </div>
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-orange-500 text-lg shadow-md">
              🍔
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">Demo Burger</p>
              <p className="flex items-center gap-1 text-[11px] leading-tight text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Abierto · 25–35 min
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href="/"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:flex sm:items-center sm:gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> POS
            </Link>
            <ThemeToggle />
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button className="relative">
                  <ShoppingBag className="h-4 w-4" />
                  <span className="hidden sm:inline">Carrito</span>
                  {count > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground">
                      {count}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <CartSheet
                cart={cart}
                total={total}
                checkout={checkout}
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
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute -right-20 top-10 h-96 w-96 rounded-full bg-orange-500/20 blur-[120px]" />
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:py-16 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium shadow-sm">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              4.8 · 1.2k reseñas · Top 10 en la ciudad
            </div>
            <h1 className="text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Hamburguesas artesanales{" "}
              <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                que enamoran
              </span>{" "}
              🔥
            </h1>
            <p className="mt-4 max-w-md text-balance text-muted-foreground">
              Carne 100% de res, pan brioche horneado a diario e ingredientes frescos. Pide en línea y
              recíbelo caliente en tu puerta.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => scrollToCat(CATEGORIES[0].id)}>
                Ver el menú <ChevronDown className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setCartOpen(true)}>
                <ShoppingBag className="h-4 w-4" /> Mi pedido
              </Button>
            </div>
            <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
              <Feature icon={<Bike className="h-4 w-4" />} title="25–35 min" sub="Entrega rápida" />
              <Feature icon={<MapPin className="h-4 w-4" />} title="Envío gratis" sub="Desde $40.000" />
              <Feature icon={<ShieldCheck className="h-4 w-4" />} title="Pago seguro" sub="Nequi · PSE · Tarjeta" />
            </div>
          </motion.div>

          {/* Plato decorativo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 120, damping: 18 }}
            className="relative mx-auto hidden aspect-square w-full max-w-sm lg:block"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/25 to-orange-500/25 blur-2xl" />
            <div className="absolute inset-6 rounded-full border border-border bg-card/60 backdrop-blur" />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.span
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="text-[10rem] drop-shadow-2xl"
              >
                🍔
              </motion.span>
            </div>
            <FloatChip className="left-0 top-12" delay={0.3} emoji="🧀" label="Cheddar fundido" />
            <FloatChip className="right-2 top-24" delay={0.5} emoji="🥓" label="Tocineta crujiente" />
            <FloatChip className="bottom-16 left-2" delay={0.7} emoji="🥬" label="Vegetales frescos" />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="absolute -bottom-2 right-4 rounded-2xl border border-border bg-card px-4 py-2.5 shadow-xl"
            >
              <p className="text-[11px] text-muted-foreground">Desde</p>
              <p className="text-lg font-black text-primary">{formatCurrency(25900)}</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Más vendidos */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <h2 className="text-lg font-bold">Los más vendidos</h2>
        </div>
        <div className="scrollbar-thin -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
          {popular.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                add(p);
                toast.success(`${p.name} añadido`);
              }}
              className="group relative w-44 shrink-0 overflow-hidden rounded-2xl border border-border bg-card text-left transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <ProductImage emoji={p.image} category={p.category} className="h-28 w-full rounded-b-none" size="lg" />
              <Badge variant="warning" className="absolute left-2 top-2">
                ★ Top
              </Badge>
              <div className="p-3">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-bold">{formatCurrency(p.price)}</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-110">
                    <Plus className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Category nav (scroll-spy) */}
      <div className="sticky top-16 z-20 border-y border-border bg-background/90 backdrop-blur-md">
        <div ref={navRef} className="scrollbar-thin mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              data-cat={c.id}
              onClick={() => scrollToCat(c.id)}
              className={cn(
                "whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                activeCat === c.id
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border hover:bg-muted"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menú por secciones */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {grouped.map(({ category, items }) => (
          <section
            key={category.id}
            id={`cat-${category.id}`}
            ref={(el) => {
              sectionRefs.current[category.id] = el;
            }}
            className="scroll-mt-32 pb-10"
          >
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              {category.name}
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {items.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {items.map((p, i) => {
                const qty = qtyOf(p.id);
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ delay: (i % 4) * 0.04 }}
                    className={cn(
                      "flex gap-3 rounded-2xl border bg-card p-3 transition-colors",
                      qty > 0 ? "border-primary/40 ring-1 ring-primary/20" : "border-border",
                      !p.available && "opacity-60"
                    )}
                  >
                    <div className="relative">
                      <ProductImage emoji={p.image} category={p.category} className="h-24 w-24 shrink-0" size="md" />
                      {p.popular && (
                        <span className="absolute left-1 top-1 rounded-md bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                          ★
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="font-semibold leading-tight">{p.name}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" /> {p.prepMinutes} min
                        </span>
                        {p.tags.slice(0, 1).map((t) => (
                          <span key={t} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {t}
                          </span>
                        ))}
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className="font-bold">{formatCurrency(p.price)}</span>
                        {!p.available ? (
                          <span className="text-xs font-medium text-muted-foreground">Agotado</span>
                        ) : qty > 0 ? (
                          <div className="flex items-center gap-1 rounded-lg border border-primary bg-primary/5">
                            <button
                              onClick={() => decrement(p.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-l-lg text-primary hover:bg-primary/10"
                            >
                              {qty === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                            </button>
                            <span className="w-5 text-center text-sm font-bold">{qty}</span>
                            <button
                              onClick={() => increment(p.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-r-lg text-primary hover:bg-primary/10"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              add(p);
                              toast.success(`${p.name} añadido`);
                            }}
                          >
                            <Plus className="h-4 w-4" /> Añadir
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-orange-500 text-lg">
                🍔
              </div>
              <p className="font-bold">Demo Burger</p>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Hamburguesas artesanales hechas con amor. Pide en línea y disfruta.
            </p>
          </div>
          <FooterCol title="Horario" items={["Lun–Jue: 12–22h", "Vie–Sáb: 12–24h", "Dom: 12–21h"]} />
          <FooterCol title="Contacto" items={["Calle 10 #43-21", "Medellín, Colombia", "+57 300 245 1188"]} />
          <FooterCol title="Pagos" items={["Efectivo · Tarjeta", "Nequi · Daviplata", "PSE"]} />
        </div>
        <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
          Demo Burger · Potenciado por <span className="font-semibold text-foreground">Axis POS</span> · Pedidos sincronizados en tiempo real con la cocina
        </div>
      </footer>

      {/* Barra flotante de carrito (móvil) */}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 p-3 backdrop-blur-md lg:hidden"
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

function Feature({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-2.5 text-center backdrop-blur">
      <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-xs font-semibold leading-tight">{title}</p>
      <p className="text-[10px] leading-tight text-muted-foreground">{sub}</p>
    </div>
  );
}

function FloatChip({
  className,
  emoji,
  label,
  delay,
}: {
  className: string;
  emoji: string;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
      transition={{
        opacity: { delay },
        scale: { delay },
        y: { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay },
      }}
      className={cn(
        "absolute flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium shadow-lg",
        className
      )}
    >
      <span className="text-base">{emoji}</span>
      {label}
    </motion.div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
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
                    {method === "nequi" ? "Nequi" : "Daviplata"} · <span className="font-semibold text-foreground">300 245 1188</span> · Demo Burger
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
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-2xl">
                  {l.product.image}
                </div>
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
            <p className="mb-2 text-sm font-semibold">Sube tu comprobante de pago</p>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 p-6 text-center transition-colors hover:border-primary hover:bg-primary/5">
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

        <Button className="mt-5 w-full" variant={needsReceipt ? "outline" : "default"} onClick={onClose}>
          {needsReceipt ? "Lo haré más tarde" : "Seguir explorando"}
        </Button>
      </motion.div>
    </motion.div>
  );
}
