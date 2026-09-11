"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { readDisplay, subscribeDisplay, IDLE_STATE, type DisplayState, type DisplayLine } from "@/lib/customer-display";
import { cn, formatCurrency } from "@/lib/utils";

const PERSON_COLORS = [
  "bg-violet-500", "bg-emerald-500", "bg-sky-500", "bg-amber-500",
  "bg-rose-500", "bg-fuchsia-500", "bg-cyan-500", "bg-orange-500",
];

function isImageUrl(src: string) {
  return src.startsWith("data:") || src.startsWith("http") || src.startsWith("/");
}

/**
 * Pantalla del cliente: lo que la caja le está cobrando, y nada más.
 *
 * Va en un segundo monitor de cara al comprador. No tiene menú ni botones; la
 * letra es grande, cada producto entra animado y el total es lo primero que
 * se ve. Se alimenta de lo que publica la caja en el mismo navegador; nunca
 * consulta el servidor.
 */
export default function CustomerDisplayPage() {
  const restaurant = useAppStore((s) => s.restaurant);
  const [state, setState] = useState<DisplayState>(IDLE_STATE);
  const [clock, setClock] = useState("");

  useEffect(() => {
    setState(readDisplay());
    const unsubscribe = subscribeDisplay(setState);
    const tick = () =>
      setClock(new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const timer = setInterval(tick, 15_000);
    return () => { unsubscribe(); clearInterval(timer); };
  }, []);

  // El "gracias" se queda un rato y luego la pantalla vuelve a la bienvenida,
  // por si la caja no abre otra cuenta enseguida.
  useEffect(() => {
    if (state.phase !== "paid") return;
    const t = setTimeout(() => setState((s) => (s.phase === "paid" ? { ...IDLE_STATE, updatedAt: Date.now() } : s)), 12_000);
    return () => clearTimeout(t);
  }, [state.phase, state.updatedAt]);

  const pending = Math.max(state.total - state.collected, 0);
  const splitting = Boolean(state.split && state.split.length > 0);
  const view: "idle" | "paid" | "billing" =
    state.phase === "paid" ? "paid" : state.phase === "idle" || state.lines.length === 0 ? "idle" : "billing";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Fondo: un resplandor suave del color de la marca, sin distraer. */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-52 -right-32 h-[30rem] w-[30rem] rounded-full bg-gold/15 blur-3xl" />
      </div>

      <header className="flex items-center justify-between px-10 py-6">
        <div className="flex items-center gap-4">
          <Logo src={restaurant.logo} size="sm" />
          <div>
            <p className="text-2xl font-bold tracking-tight">{restaurant.name}</p>
            <AnimatePresence mode="wait">
              {view === "billing" && (
                <motion.p
                  key="who"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-base text-muted-foreground"
                >
                  {state.table ? `Mesa ${state.table}` : state.origin || "Venta directa"}
                  {state.waiter ? ` · Le atendió ${state.waiter}` : ""}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
        <p className="text-xl tabular-nums text-muted-foreground">{clock}</p>
      </header>

      <AnimatePresence mode="wait">
        {view === "idle" && (
          <motion.main
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-1 flex-col items-center justify-center gap-6 p-10 text-center"
          >
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-[2.5rem] bg-primary/20"
                animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              />
              <Logo src={restaurant.logo} size="lg" />
            </div>
            <div>
              <p className="text-lg font-medium uppercase tracking-[0.3em] text-primary">Bienvenido</p>
              <h1 className="mt-2 text-6xl font-black tracking-tight">{restaurant.name}</h1>
            </div>
            <p className="max-w-xl text-2xl text-muted-foreground">Su cuenta aparecerá aquí cuando la caja empiece a cobrar.</p>
          </motion.main>
        )}

        {view === "paid" && (
          <motion.main
            key="paid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col items-center justify-center gap-6 p-10 text-center"
          >
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="flex h-36 w-36 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl shadow-emerald-500/40"
            >
              <Check className="h-20 w-20" strokeWidth={3} />
            </motion.span>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <h1 className="text-6xl font-black tracking-tight">¡Gracias por su compra!</h1>
              <p className="mt-3 text-5xl font-bold tabular-nums text-primary">{formatCurrency(state.total)}</p>
              <p className="mt-3 text-2xl text-muted-foreground">
                {state.method ? `Pagado con ${state.method}` : "Pagado"}
                {state.invoiceNumber ? ` · Factura ${state.invoiceNumber}` : ""}
              </p>
            </motion.div>
            <p className="mt-4 flex items-center gap-2 text-xl text-muted-foreground">
              <Sparkles className="h-5 w-5 text-gold" /> Esperamos verle pronto
            </p>
          </motion.main>
        )}

        {view === "billing" && (
          <motion.main
            key="billing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid min-h-0 flex-1 grid-cols-1 gap-8 px-10 pb-10 lg:grid-cols-[1fr_28rem]"
          >
            {/* Productos */}
            <section className="flex min-h-0 flex-col">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">Su pedido</h2>
              <ul className="flex-1 space-y-3 overflow-y-auto pr-2">
                <AnimatePresence initial={false}>
                  {state.lines.map((l, i) => (
                    <LineRow key={`${l.name}-${i}`} line={l} />
                  ))}
                </AnimatePresence>
              </ul>
            </section>

            {/* Ticket */}
            <aside className="flex flex-col justify-end">
              <div className="rounded-3xl border border-border bg-card p-8 shadow-2xl shadow-black/5">
                <dl className="space-y-2.5 text-xl">
                  <Row label="Subtotal" value={formatCurrency(state.subtotal)} />
                  {state.discount > 0 && <Row label="Descuento" value={`- ${formatCurrency(state.discount)}`} accent />}
                  {state.taxes.map((t) => (
                    <Row key={t.name} label={t.name} value={formatCurrency(t.amount)} muted />
                  ))}
                  {state.tip > 0 && <Row label="Propina" value={formatCurrency(state.tip)} muted />}
                </dl>

                {splitting && (
                  <div className="mt-5 border-t border-dashed border-border pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Cuenta dividida</p>
                    <ul className="space-y-1.5">
                      {state.split!.map((p) => (
                        <motion.li
                          key={p.index}
                          layout
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-lg transition-colors",
                            p.paid ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted/50"
                          )}
                        >
                          <span className="flex items-center gap-2.5">
                            <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white", PERSON_COLORS[p.index % PERSON_COLORS.length])}>
                              {p.paid ? <Check className="h-4 w-4" strokeWidth={3} /> : p.index + 1}
                            </span>
                            Persona {p.index + 1}
                            {p.paid && p.method && <span className="text-sm opacity-80">· {p.method}</span>}
                          </span>
                          <span className="font-semibold tabular-nums">{p.total === 0 ? "—" : formatCurrency(p.total)}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-6 rounded-2xl bg-primary px-6 py-5 text-primary-foreground shadow-lg shadow-primary/30">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] opacity-80">
                    {splitting ? "Pendiente por pagar" : "Total a pagar"}
                  </p>
                  <motion.p
                    key={pending}
                    initial={{ scale: 0.96, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mt-1 text-6xl font-black tabular-nums tracking-tight"
                  >
                    {formatCurrency(pending)}
                  </motion.p>
                  {state.collected > 0 && (
                    <p className="mt-2 text-base opacity-80">
                      Ya pagado {formatCurrency(state.collected)} de {formatCurrency(state.total)}
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </motion.main>
        )}
      </AnimatePresence>

      <footer className="flex items-center justify-center gap-2 px-10 py-3 text-xs uppercase tracking-[0.3em] text-muted-foreground/60">
        Axis POS
      </footer>
    </div>
  );
}

function Logo({ src, size }: { src: string; size: "sm" | "lg" }) {
  const box = size === "lg" ? "h-44 w-44 rounded-[2.5rem] text-8xl" : "h-14 w-14 rounded-2xl text-3xl";
  if (isImageUrl(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn("relative object-cover shadow-xl", box)} />;
  }
  return (
    <span className={cn("relative flex items-center justify-center bg-card shadow-xl ring-1 ring-border", box)}>
      {src || "🍽️"}
    </span>
  );
}

function LineRow({ line }: { line: DisplayLine }) {
  const image = line.image ?? "";
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="flex items-center gap-5 rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur"
    >
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-muted text-4xl">
        {isImageUrl(image) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full rounded-2xl object-contain" />
        ) : (
          image || "🍽️"
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-2xl font-semibold leading-tight">{line.name}</span>
        <span className="mt-0.5 block text-base text-muted-foreground">
          {line.quantity} × {formatCurrency(line.unitPrice)}
          {line.notes ? ` · ${line.notes}` : ""}
        </span>
      </span>
      <span className="shrink-0 text-2xl font-bold tabular-nums">{formatCurrency(line.total)}</span>
    </motion.li>
  );
}

function Row({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className={cn(muted && "text-muted-foreground")}>{label}</dt>
      <dd className={cn("font-semibold tabular-nums", muted && "font-medium text-muted-foreground", accent && "text-emerald-500")}>{value}</dd>
    </div>
  );
}
