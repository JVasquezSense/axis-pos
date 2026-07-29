"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mic, MicOff, Loader2, Check, X, AlertTriangle, Trash2 } from "lucide-react";
import type { ModifierOption, Product } from "@/types";
import type { VoiceOrderPlan } from "@/app/api/ai/voice-order/route";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useMenuStore } from "@/store/menu.store";
import { useOrderStore } from "@/store/order.store";
import { useTablesStore } from "@/store/tables.store";
import { useFeatures } from "@/lib/features";
import { matchProduct, matchVariation, parseTranscriptLocally, singularize } from "@/lib/voice-order";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Línea dictada ya resuelta contra la carta, pendiente de que el mesero confirme. */
interface Draft {
  key: string;
  product: Product;
  quantity: number;
  notes?: string;
  variation?: { id: string; name: string; priceDelta: number } | null;
  remove?: boolean;
  /** Por debajo de este umbral la coincidencia se marca como dudosa. */
  sure: boolean;
}

const SURE_THRESHOLD = 0.72;

export function VoiceOrder() {
  const { has } = useFeatures();
  const products = useMenuStore((s) => s.products);
  const addProduct = useOrderStore((s) => s.addProduct);
  const lines = useOrderStore((s) => s.lines);
  const removeLine = useOrderStore((s) => s.remove);
  const decrement = useOrderStore((s) => s.decrement);
  const setTable = useOrderStore((s) => s.setTable);
  const tables = useTablesStore((s) => s.tables);

  const { supported, listening, transcript, error, getTranscript, start, stop, reset } = useSpeechRecognition();
  const [thinking, setThinking] = useState(false);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [table, setDraftTable] = useState<number | null>(null);
  const [unknown, setUnknown] = useState<string[]>([]);

  if (!has("voice")) return null;

  const available = products.filter((p) => p.available);

  /** Resuelve nombres dictados contra la carta real. */
  const toDrafts = (
    spoken: { spoken: string; quantity: number; notes?: string; variation?: string; remove?: boolean }[]
  ): { drafts: Draft[]; misses: string[] } => {
    const out: Draft[] = [];
    const misses: string[] = [];
    spoken.forEach((item, i) => {
      const match =
        matchProduct(item.spoken, available) ?? matchProduct(singularize(item.spoken), available);
      if (!match) {
        misses.push(item.spoken);
        return;
      }
      out.push({
        key: `${match.product.id}-${i}`,
        product: match.product,
        quantity: Math.max(1, Math.round(item.quantity)),
        notes: item.notes,
        variation: matchVariation(item.variation, match.product),
        remove: item.remove,
        sure: match.score >= SURE_THRESHOLD,
      });
    });
    return { drafts: out, misses };
  };

  const interpret = async (text: string) => {
    setThinking(true);
    try {
      let plan: VoiceOrderPlan | null = null;
      try {
        const res = await fetch("/api/ai/voice-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: text,
            menu: available.map((p) => p.name),
            current: lines.map((l) => `${l.quantity}× ${l.product.name}`),
          }),
        });
        plan = await res.json();
      } catch {
        plan = null;
      }

      // Sin IA (o si no entendió nada): reglas locales sobre la misma frase.
      const useAi = plan?.ai === true && (plan.lines.length > 0 || plan.unknown.length > 0);
      const spoken = useAi
        ? plan!.lines.map((l) => ({
            spoken: l.name,
            quantity: l.quantity,
            notes: l.notes,
            variation: l.variation,
            remove: l.remove,
          }))
        : parseTranscriptLocally(text).lines;
      const spokenTable = useAi ? plan!.table : parseTranscriptLocally(text).table;

      const { drafts: resolved, misses } = toDrafts(spoken);
      setDrafts(resolved);
      setUnknown([...(useAi ? plan!.unknown : []), ...misses]);
      setDraftTable(spokenTable ?? null);

      if (resolved.length === 0) {
        toast.error("No reconocí productos de la carta", {
          description: "Repite el nombre como aparece en el menú.",
        });
      }
    } finally {
      setThinking(false);
    }
  };

  const finishDictation = () => {
    stop();
    // El último fragmento puede llegar unos milisegundos después de soltar.
    setTimeout(() => {
      const text = getTranscript();
      if (text) interpret(text);
    }, 350);
  };

  const discard = () => {
    setDrafts(null);
    setUnknown([]);
    setDraftTable(null);
    reset();
  };

  const confirm = () => {
    if (!drafts) return;
    let added = 0;
    let removed = 0;

    for (const d of drafts) {
      if (d.remove) {
        const line = lines.find((l) => String(l.product.id) === String(d.product.id));
        if (!line) continue;
        if (d.quantity >= line.quantity) removeLine(line.id);
        else for (let i = 0; i < d.quantity; i++) decrement(line.id);
        removed++;
        continue;
      }
      // La variación viaja como modificador, igual que en el diálogo del menú.
      const modifiers: ModifierOption[] = d.variation
        ? [{ id: `var-${d.variation.id}`, name: d.variation.name, price: d.variation.priceDelta }]
        : [];
      for (let i = 0; i < d.quantity; i++) addProduct(d.product, modifiers, d.notes);
      added += d.quantity;
    }

    if (table !== null && tables.some((t) => t.number === table)) setTable(table);

    const parts = [added > 0 ? `${added} ítem${added > 1 ? "s" : ""} agregado${added > 1 ? "s" : ""}` : "",
      removed > 0 ? `${removed} quitado${removed > 1 ? "s" : ""}` : ""].filter(Boolean);
    toast.success(parts.join(" · ") || "Pedido actualizado", {
      description: table !== null ? `Mesa ${table}` : undefined,
    });
    discard();
  };

  const setQty = (key: string, delta: number) =>
    setDrafts((prev) =>
      prev
        ? prev.map((d) => (d.key === key ? { ...d, quantity: Math.max(1, d.quantity + delta) } : d))
        : prev
    );

  const drop = (key: string) =>
    setDrafts((prev) => (prev ? prev.filter((d) => d.key !== key) : prev));

  if (!supported) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
        <MicOff className="h-4 w-4 shrink-0" />
        Este navegador no permite dictado. Usa Chrome o Edge para tomar el pedido por voz.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={listening ? "destructive" : "outline"}
          className="flex-1 select-none"
          disabled={thinking}
          onPointerDown={() => { reset(); start(); }}
          onPointerUp={finishDictation}
          onPointerLeave={() => { if (listening) finishDictation(); }}
          onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !listening) { reset(); start(); } }}
          onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") finishDictation(); }}
        >
          {thinking ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Interpretando…</>
          ) : listening ? (
            <><span className="h-2 w-2 animate-pulse rounded-full bg-white" /> Escuchando… suelta al terminar</>
          ) : (
            <><Mic className="h-4 w-4" /> Mantén pulsado y dicta</>
          )}
        </Button>
      </div>

      {(listening || transcript) && !drafts && (
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs italic text-muted-foreground">
          {transcript || "Di, por ejemplo: «dos mojitos sin hielo y un teriyaki thai para la mesa 4»"}
        </p>
      )}

      {error && (
        <p className="flex items-start gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

      {drafts && (
        <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Confirma lo dictado
            </p>
            {table !== null && <Badge variant="secondary">Mesa {table}</Badge>}
          </div>

          {drafts.map((d) => (
            <div key={d.key} className="flex items-center gap-2 rounded-lg bg-background px-2.5 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {d.remove && <span className="text-destructive">Quitar · </span>}
                  {d.product.name}
                  {d.variation && <span className="text-muted-foreground"> · {d.variation.name}</span>}
                </p>
                {d.notes && <p className="truncate text-[11px] text-muted-foreground">{d.notes}</p>}
                {!d.sure && (
                  <p className="text-[11px] text-warning">¿Es este? Lo entendí parecido, no idéntico.</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setQty(d.key, -1)} className="h-6 w-6 rounded-md border border-border text-sm">−</button>
                <span className="w-5 text-center text-sm font-semibold">{d.quantity}</span>
                <button onClick={() => setQty(d.key, 1)} className="h-6 w-6 rounded-md border border-border text-sm">+</button>
                <button onClick={() => drop(d.key)} className="ml-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {unknown.length > 0 && (
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              No está en la carta: {unknown.join(", ")}
            </p>
          )}

          <div className="flex gap-2 pt-0.5">
            <Button size="sm" variant="outline" className="flex-1" onClick={discard}>
              <X className="h-4 w-4" /> Descartar
            </Button>
            <Button size="sm" className={cn("flex-1")} onClick={confirm} disabled={drafts.length === 0}>
              <Check className="h-4 w-4" /> Agregar al pedido
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
