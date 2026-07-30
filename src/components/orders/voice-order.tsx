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
import {
  bestPhraseFor,
  matchProduct,
  matchVariation,
  parseTranscriptLocally,
  singularize,
  suggestFromTranscript,
  suggestProducts,
  suggestReplacements,
} from "@/lib/voice-order";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Línea dictada ya resuelta contra la carta, pendiente de que el mesero confirme. */
interface Draft {
  key: string;
  /** Lo que se oyó, para recalcular sugerencias si el mesero corrige. */
  spoken: string;
  product: Product;
  quantity: number;
  notes?: string;
  variation?: { id: string; name: string; priceDelta: number } | null;
  remove?: boolean;
  /** Por debajo de este umbral la coincidencia se marca como dudosa. */
  sure: boolean;
  /** Está en la carta pero sin stock: se muestra y no se agrega. */
  agotado?: boolean;
  /** Otros productos que pudo ser: se ofrecen para corregir con un toque. */
  options: Product[];
}

/** Algo dictado que no corresponde a ningún producto, con lo más parecido. */
interface Miss {
  key: string;
  spoken: string;
  quantity: number;
  options: Product[];
}

const SURE_THRESHOLD = 0.72;

export function VoiceOrder() {
  const { has } = useFeatures();
  const products = useMenuStore((s) => s.products);
  const addProduct = useOrderStore((s) => s.addProduct);
  const lines = useOrderStore((s) => s.lines);
  const removeLine = useOrderStore((s) => s.remove);
  const decrement = useOrderStore((s) => s.decrement);
  const loadTableOrder = useOrderStore((s) => s.loadTableOrder);
  const tableNumber = useOrderStore((s) => s.tableNumber);
  const tables = useTablesStore((s) => s.tables);

  const { supported, listening, transcript, error, getTranscript, start, stop, reset } = useSpeechRecognition();
  const [thinking, setThinking] = useState(false);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [table, setDraftTable] = useState<number | null>(null);
  const [unknown, setUnknown] = useState<Miss[]>([]);
  const [localOnly, setLocalOnly] = useState(false);

  if (!has("voice")) return null;


  /** Resuelve nombres dictados contra la carta real. */
  const toDrafts = (
    spoken: { spoken: string; quantity: number; notes?: string; variation?: string; remove?: boolean }[],
    transcript: string,
    /** true = los nombres los eligió el modelo, no las reglas locales. */
    fromAi: boolean
  ): { drafts: Draft[]; misses: Miss[] } => {
    const out: Draft[] = [];
    const misses: Miss[] = [];
    spoken.forEach((item, i) => {
      const quantity = Math.max(1, Math.round(item.quantity));
      const match =
        matchProduct(item.spoken, products) ?? matchProduct(singularize(item.spoken), products);
      if (!match) {
        // No cuadra con nada: se ofrecen los nombres más cercanos de la carta.
        misses.push({
          key: `miss-${i}`,
          spoken: item.spoken,
          quantity,
          options: suggestProducts(item.spoken, products.filter((p) => p.available)),
        });
        return;
      }
      const agotado = !match.product.available && !item.remove;
      // Contra qué se compara la confianza: si el nombre vino del modelo, contra
      // el trozo del dictado que más se le parece; si vino de las reglas, contra
      // lo que se oyó tal cual.
      const heard = bestPhraseFor(match.product.name, transcript);
      const spokenFor = heard.phrase || item.spoken;
      // Con IA la confianza es SOLO la del audio: el nombre ya viene de la carta,
      // así que compararlo con la carta siempre daría 1 y nunca dudaríamos.
      const confidence = fromAi ? heard.score : Math.max(match.score, heard.score);
      out.push({
        key: `${match.product.id}-${i}`,
        spoken: spokenFor,
        product: match.product,
        quantity,
        notes: item.notes,
        variation: matchVariation(item.variation, match.product),
        remove: item.remove,
        sure: confidence >= SURE_THRESHOLD,
        agotado,
        // Agotado → qué vender en su lugar. Dudoso → los otros candidatos: si el
        // nombre elegido no se parece a nada del audio, hay que buscarlos en el
        // dictado completo y no alrededor del propio error.
        options: agotado
          ? suggestReplacements(match.product, products)
          : (() => {
              const pool = products.filter((p) => p.available && p.id !== match.product.id);
              return heard.score < 0.35
                ? suggestFromTranscript(transcript, pool)
                : suggestProducts(spokenFor, pool);
            })(),
      });
    });
    return { drafts: out, misses };
  };

  /** Cambia el producto de una línea por el que el mesero eligió de las sugerencias. */
  const swap = (key: string, product: Product) =>
    setDrafts((prev) =>
      prev
        ? prev.map((d) =>
            d.key === key
              ? {
                  ...d,
                  product,
                  sure: true,
                  agotado: false,
                  variation: null,
                  options: suggestProducts(
                    d.spoken,
                    products.filter((p) => p.available && p.id !== product.id)
                  ),
                }
              : d
          )
        : prev
    );

  /** Convierte algo no reconocido en una línea, con el producto que se eligió. */
  const resolveMiss = (miss: Miss, product: Product) => {
    setDrafts((prev) => [
      ...(prev ?? []),
      {
        key: `${product.id}-${miss.key}`,
        spoken: miss.spoken,
        product,
        quantity: miss.quantity,
        sure: true,
        options: suggestProducts(
          miss.spoken,
          products.filter((p) => p.available && p.id !== product.id)
        ),
      },
    ]);
    setUnknown((prev) => prev.filter((m) => m.key !== miss.key));
  };

  const interpret = async (text: string) => {
    setThinking(true);
    try {
      let plan: VoiceOrderPlan | null = null;
      try {
        const res = await fetch("/api/ai/voice-order", {
          method: "POST",
          // Tope duro: si la IA no contesta pronto, se sigue con reglas locales.
          // Vale más un borrador imperfecto al instante que un mesero esperando.
          signal: AbortSignal.timeout(7000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: text,
            menu: products.map((p) => p.name),
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

      const { drafts: resolved, misses } = toDrafts(spoken, text, useAi);
      // Lo que el modelo no reconoció también merece sugerencias.
      const aiMisses: Miss[] = (useAi ? plan!.unknown : []).map((text, i) => ({
        key: `ai-miss-${i}`,
        spoken: text,
        quantity: 1,
        options: suggestProducts(text, products.filter((p) => p.available)),
      }));
      setDrafts(resolved);
      setUnknown([...aiMisses, ...misses]);
      setLocalOnly(!useAi);
      setDraftTable(spokenTable ?? null);

      if (resolved.length === 0 && aiMisses.length === 0 && misses.length === 0) {
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

  const confirm = async () => {
    if (!drafts) return;
    let added = 0;
    let removed = 0;

    // La mesa PRIMERO: cambiarla reemplaza las líneas del panel por la cuenta de
    // esa mesa, así que hacerlo después borraría lo que acabamos de agregar.
    if (table !== null && tables.some((t) => t.number === table) && table !== tableNumber) {
      await loadTableOrder(table);
    }

    for (const d of drafts) {
      if (d.agotado) continue;
      if (d.remove) {
        const line = useOrderStore
          .getState()
          .lines.find((l) => String(l.product.id) === String(d.product.id));
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

  /** Sugerencias de una línea, sin proponer lo que ya está en otra línea. */
  const alternativesFor = (d: Draft) =>
    d.options.filter(
      (o) => !(drafts ?? []).some((x) => x.key !== d.key && String(x.product.id) === String(o.id))
    );

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

      {(drafts || unknown.length > 0) && (
        <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Confirma lo dictado
            </p>
            <div className="flex items-center gap-1.5">
              {localOnly && <Badge variant="secondary">Sin IA</Badge>}
              {table !== null && <Badge variant="secondary">Mesa {table}</Badge>}
            </div>
          </div>

          {(drafts ?? []).map((d) => (
            <div key={d.key} className="rounded-lg bg-background px-2.5 py-2">
             <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {d.remove && <span className="text-destructive">Quitar · </span>}
                  {d.product.name}
                  {d.variation && <span className="text-muted-foreground"> · {d.variation.name}</span>}
                </p>
                {d.notes && <p className="truncate text-[11px] text-muted-foreground">{d.notes}</p>}
                {d.agotado ? (
                  <p className="text-[11px] text-destructive">Agotado: no se puede agregar.</p>
                ) : (
                  !d.sure && (
                    <p className="text-[11px] text-warning">¿Es este? Lo entendí parecido, no idéntico.</p>
                  )
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

              {/* Corregir con un toque en lugar de repetir todo el dictado. */}
              {!d.remove && (d.agotado || !d.sure) && alternativesFor(d).length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-border pt-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    {d.agotado ? "En su lugar:" : "¿O era…?"}
                  </span>
                  {alternativesFor(d).map((o) => (
                    <button
                      key={o.id}
                      onClick={() => swap(d.key, o)}
                      className="rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium transition-colors hover:border-primary hover:text-primary"
                    >
                      {o.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {unknown.map((m) => (
            <div key={m.key} className="rounded-lg border border-dashed border-warning/50 bg-background px-2.5 py-2">
              <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                <span>
                  No reconocí <strong className="text-foreground">«{m.spoken}»</strong>
                  {m.quantity > 1 && ` (×${m.quantity})`}
                </span>
              </p>
              {m.options.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">¿Quisiste decir…?</span>
                  {m.options.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => resolveMiss(m, o)}
                      className="rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium transition-colors hover:border-primary hover:text-primary"
                    >
                      {o.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  No hay nada parecido en la carta. Búscalo en el menú o vuelve a dictarlo.
                </p>
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-0.5">
            <Button size="sm" variant="outline" className="flex-1" onClick={discard}>
              <X className="h-4 w-4" /> Descartar
            </Button>
            <Button
              size="sm"
              className={cn("flex-1")}
              onClick={confirm}
              disabled={(drafts ?? []).every((d) => d.agotado)}
            >
              <Check className="h-4 w-4" /> Agregar al pedido
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
