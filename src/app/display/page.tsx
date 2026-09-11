"use client";

import { useEffect, useState } from "react";
import { Check, Receipt } from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { readDisplay, subscribeDisplay, IDLE_STATE, type DisplayState } from "@/lib/customer-display";
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
 * Va en un segundo monitor de cara al comprador, así que no tiene menú ni
 * botones, la letra es grande y el total es lo primero que se ve. Se alimenta
 * de lo que publica la caja en el mismo navegador; nunca consulta el servidor.
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

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-8 py-4">
        <div className="flex items-center gap-3">
          {isImageUrl(restaurant.logo) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={restaurant.logo} alt="" className="h-12 w-12 rounded-xl object-cover" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">{restaurant.logo}</span>
          )}
          <div>
            <p className="text-xl font-bold leading-tight">{restaurant.name}</p>
            {state.phase !== "idle" && (
              <p className="text-sm text-muted-foreground">
                {state.table ? `Mesa ${state.table}` : state.origin || "Venta directa"}
                {state.waiter ? ` · Le atendió ${state.waiter}` : ""}
              </p>
            )}
          </div>
        </div>
        <p className="text-lg tabular-nums text-muted-foreground">{clock}</p>
      </header>

      {state.phase === "idle" || state.lines.length === 0 ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          {isImageUrl(restaurant.logo) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={restaurant.logo} alt="" className="h-40 w-40 rounded-3xl object-cover shadow-xl" />
          ) : (
            <span className="text-8xl">{restaurant.logo}</span>
          )}
          <h1 className="text-4xl font-bold">Bienvenido a {restaurant.name}</h1>
          <p className="text-xl text-muted-foreground">Su cuenta aparecerá aquí.</p>
        </main>
      ) : state.phase === "paid" ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
          <span className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
            <Check className="h-16 w-16" strokeWidth={2.5} />
          </span>
          <h1 className="text-5xl font-bold">¡Gracias por su compra!</h1>
          <p className="text-3xl font-semibold tabular-nums">{formatCurrency(state.total)}</p>
          <p className="text-lg text-muted-foreground">
            {state.method ? `Pagado con ${state.method}` : "Pagado"}
            {state.invoiceNumber ? ` · Factura ${state.invoiceNumber}` : ""}
          </p>
        </main>
      ) : (
        <main className="grid flex-1 grid-cols-1 gap-0 lg:grid-cols-[1fr_26rem]">
          {/* Productos */}
          <section className="flex min-h-0 flex-col p-8">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Receipt className="h-4 w-4" /> Su pedido
            </h2>
            <ul className="flex-1 space-y-3 overflow-y-auto">
              {state.lines.map((l, i) => (
                <li key={i} className="flex items-start justify-between gap-6 border-b border-border/60 pb-3 text-2xl">
                  <span className="flex min-w-0 gap-4">
                    <span className="w-12 shrink-0 text-right tabular-nums text-muted-foreground">{l.quantity}×</span>
                    <span className="min-w-0">
                      <span className="block font-medium leading-tight">{l.name}</span>
                      {l.notes && <span className="block text-base text-muted-foreground">{l.notes}</span>}
                      {l.quantity > 1 && (
                        <span className="block text-base text-muted-foreground">{formatCurrency(l.unitPrice)} c/u</span>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(l.total)}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Totales */}
          <aside className="flex flex-col justify-end border-t border-border bg-muted/30 p-8 lg:border-l lg:border-t-0">
            <dl className="space-y-2 text-xl">
              <Row label="Subtotal" value={formatCurrency(state.subtotal)} />
              {state.discount > 0 && <Row label="Descuento" value={`- ${formatCurrency(state.discount)}`} accent />}
              {state.taxes.map((t) => (
                <Row key={t.name} label={t.name} value={formatCurrency(t.amount)} muted />
              ))}
              {state.tip > 0 && <Row label="Propina" value={formatCurrency(state.tip)} muted />}
            </dl>
            {state.split && state.split.length > 0 && (
              <div className="mt-5 border-t border-border pt-4">
                <p className="mb-2 text-sm uppercase tracking-wider text-muted-foreground">Cuenta dividida</p>
                <ul className="space-y-1.5">
                  {state.split.map((p) => (
                    <li
                      key={p.index}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-lg",
                        p.paid ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-background/60"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white", PERSON_COLORS[p.index % PERSON_COLORS.length])}>
                          {p.paid ? <Check className="h-4 w-4" /> : p.index + 1}
                        </span>
                        Persona {p.index + 1}
                        {p.paid && p.method && <span className="text-sm opacity-80">· {p.method}</span>}
                      </span>
                      <span className="font-semibold tabular-nums">{p.total === 0 ? "—" : formatCurrency(p.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-5 border-t-2 border-border pt-5">
              <p className="text-lg uppercase tracking-wider text-muted-foreground">
                {state.split && state.split.length > 0 ? "Pendiente por pagar" : "Total a pagar"}
              </p>
              <p className="text-6xl font-black tabular-nums text-primary">{formatCurrency(pending)}</p>
              {state.collected > 0 && (
                <p className="mt-2 text-lg text-muted-foreground">
                  Ya pagado {formatCurrency(state.collected)} de {formatCurrency(state.total)}
                </p>
              )}
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}

function Row({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className={cn(muted && "text-muted-foreground")}>{label}</dt>
      <dd className={cn("font-medium tabular-nums", muted && "text-muted-foreground", accent && "text-emerald-500")}>{value}</dd>
    </div>
  );
}
