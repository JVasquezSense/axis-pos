"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles, X, Send, Receipt, Tag, Boxes, Loader2,
  Users, ChefHat, CalendarClock, ChevronDown, ChevronUp,
} from "lucide-react";
import { useSalesStore } from "@/store/sales.store";
import { useRecipesStore } from "@/store/recipes.store";
import { useInventoryStore } from "@/store/inventory.store";
import { useTablesStore } from "@/store/tables.store";
import { useKitchenStore } from "@/store/kitchen.store";
import { useReservationsStore } from "@/store/reservations.store";
import { useSuppliersStore } from "@/store/suppliers.store";
import { useEmployeesStore } from "@/store/employees.store";
import { useAuditStore } from "@/store/audit.store";
import {
  buildBrief,
  buildPricing,
  buildInventoryForecast,
  buildWaiterStats,
  buildMenuEngineering,
  buildReservationsBrief,
  type AiMode,
} from "@/lib/ai-context";
import { cn } from "@/lib/utils";

function MdText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        if (/^#{1,3}\s/.test(line)) {
          const clean = line.replace(/^#{1,3}\s*/, "");
          return <p key={i} className="font-bold text-foreground">{inlineMd(clean)}</p>;
        }
        if (/^[-•]\s/.test(line.trim())) {
          const clean = line.trim().replace(/^[-•]\s*/, "");
          return <p key={i} className="pl-2 before:content-['•_'] before:text-primary">{inlineMd(clean)}</p>;
        }
        if (/^\d+\.\s/.test(line.trim())) {
          return <p key={i} className="pl-2">{inlineMd(line.trim())}</p>;
        }
        return <p key={i}>{inlineMd(line)}</p>;
      })}
    </div>
  );
}

function inlineMd(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining) {
    const bold = remaining.match(/\*\*(.+?)\*\*/);
    if (bold && bold.index !== undefined) {
      if (bold.index > 0) parts.push(remaining.slice(0, bold.index));
      parts.push(<strong key={key++} className="font-semibold text-foreground">{bold[1]}</strong>);
      remaining = remaining.slice(bold.index + bold[0].length);
    } else {
      parts.push(remaining);
      break;
    }
  }
  return <>{parts}</>;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const QUICK: { mode: AiMode; label: string; icon: React.ElementType; user: string; desc: string }[] = [
  {
    mode: "shift",
    label: "Resumen de turno",
    icon: Receipt,
    user: "Genera el resumen ejecutivo del turno.",
    desc: "Ventas, ticket, alertas",
  },
  {
    mode: "pricing",
    label: "Doctor de precios",
    icon: Tag,
    user: "Revisa mis precios y food cost.",
    desc: "Detecta platos con margen bajo",
  },
  {
    mode: "inventory",
    label: "Inventario",
    icon: Boxes,
    user: "¿Qué insumos se van a agotar pronto?",
    desc: "Predicción y reorden",
  },
  {
    mode: "waiter",
    label: "Mis meseros",
    icon: Users,
    user: "¿Cómo van mis meseros en propinas y ventas?",
    desc: "Ranking propinas y ventas",
  },
  {
    mode: "menu_eng",
    label: "Ingeniería de menú",
    icon: ChefHat,
    user: "Clasifica mis platos en la matriz BCG de rentabilidad.",
    desc: "Estrellas, vacas, puzzles, perros",
  },
  {
    mode: "reservations",
    label: "Reservaciones",
    icon: CalendarClock,
    user: "Dame el briefing de las reservaciones de hoy.",
    desc: "Resumen del día y próximas",
  },
];

function recentAudit(): string {
  const entries = useAuditStore.getState().entries.slice(0, 8);
  if (entries.length === 0) return "";
  const lines = entries.map((e) => `[${new Date(e.ts).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}] ${e.action}: ${e.details}`);
  return `\nÚltimas acciones del sistema:\n${lines.join("\n")}`;
}

function contextFor(mode: AiMode): string {
  const sales = useSalesStore.getState().records;
  const recipes = useRecipesStore.getState().recipes;
  const inv = useInventoryStore.getState();
  const tables = useTablesStore.getState().tables;
  const tickets = useKitchenStore.getState().tickets;
  const reservations = useReservationsStore.getState().reservations;
  const { purchases, suppliers } = useSuppliersStore.getState();
  const employees = useEmployeesStore.getState().employees;
  const audit = recentAudit();

  switch (mode) {
    case "pricing":
      return buildPricing(recipes) + audit;
    case "inventory":
      return buildInventoryForecast(inv.items, inv.movements, purchases, suppliers) + audit;
    case "waiter":
      return buildWaiterStats(sales, employees) + audit;
    case "menu_eng":
      return buildMenuEngineering(recipes, sales) + audit;
    case "reservations":
      return buildReservationsBrief(reservations) + audit;
    default:
      return buildBrief({ sales, recipes, inventory: inv.items, movements: inv.movements, tables, tickets, reservations, purchases, suppliers, employees }) + audit;
  }
}

export function AxisAI() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [showAllQuick, setShowAllQuick] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async (mode: AiMode, userText: string) => {
    if (busy) return;
    setBusy(true);
    const prev = messages.filter((m) => m.content).slice(-6);
    setMessages((m) => [...m, { role: "user", content: userText }, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          message: mode === "chat" ? userText : "",
          context: contextFor(mode),
          history: prev.length > 0 ? prev : undefined,
        }),
      });
      if (!res.body) throw new Error("sin respuesta");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
      }
    } catch {
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = { role: "assistant", content: "No pude responder ahora. Inténtalo de nuevo." };
        return next;
      });
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t) return;
    setInput("");
    send("chat", t);
  };

  const visibleQuick = showAllQuick ? QUICK : QUICK.slice(0, 3);

  if (!mounted) return null;

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-14 items-center gap-2 rounded-full bg-gradient-to-br from-primary to-gold px-4 text-primary-foreground shadow-xl transition-transform hover:scale-105 active:scale-95",
          open && "scale-0"
        )}
        aria-label="Axis IA"
      >
        <Sparkles className="h-5 w-5" />
        <span className="pr-1 text-sm font-semibold">Axis IA</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="fixed bottom-5 right-5 z-50 flex h-[72vh] max-h-[680px] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/10 to-gold/10 p-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-primary-foreground">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-tight">Axis IA</p>
                  <p className="text-[11px] leading-tight text-muted-foreground">Copiloto · GLM-4.5</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    className="rounded-lg px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-muted"
                  >
                    Nueva consulta
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Mensajes */}
            <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  👋 Soy <strong className="text-foreground">Axis IA</strong>. Pregúntame por tus ventas, meseros, precios, inventario o reservaciones — leo los datos reales de tu negocio.
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  {m.role === "assistant" && (
                    <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-primary-foreground">
                      <Sparkles className="h-3 w-3" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm",
                      m.role === "user"
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted"
                    )}
                  >
                    {!m.content ? <Loader2 className="h-4 w-4 animate-spin" /> : m.role === "assistant" ? <MdText text={m.content} /> : m.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Acciones rápidas */}
            {messages.length === 0 && (
              <div className="border-t border-border px-3 pb-1 pt-2">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Consultas rápidas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {visibleQuick.map((q) => (
                    <button
                      key={q.mode}
                      onClick={() => send(q.mode, q.user)}
                      disabled={busy}
                      title={q.desc}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted hover:border-primary/40 disabled:opacity-50"
                    >
                      <q.icon className="h-3.5 w-3.5 text-primary" /> {q.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowAllQuick((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                  >
                    {showAllQuick ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showAllQuick ? "Menos" : "Más"}
                  </button>
                </div>
              </div>
            )}

            {/* Ejemplos de preguntas libres */}
            {messages.length === 0 && (
              <div className="px-3 pb-2">
                <p className="mb-1 text-[10px] text-muted-foreground">También puedes preguntar:</p>
                <div className="flex flex-wrap gap-1">
                  {[
                    "¿Cuál es mi horario pico?",
                    "¿Qué plato retiraría?",
                    "¿Cómo mejorar mi ticket promedio?",
                    "¿Qué insumo comprar hoy?",
                  ].map((ex) => (
                    <button
                      key={ex}
                      onClick={() => send("chat", ex)}
                      className="rounded-lg border border-border/60 bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-border p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregunta sobre tu negocio…"
                className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
