"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mic, MicOff, Loader2, Check, X, AlertTriangle } from "lucide-react";
import type { InventoryItem, PurchaseLine, Supplier } from "@/types";
import type { VoicePurchasePlan } from "@/app/api/ai/voice-purchase/route";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useFeatures } from "@/lib/features";
import { normalize, parseQuantity } from "@/lib/voice-order";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatQty } from "@/lib/utils";

/** Similitud 0..1 por bigramas, para casar "poker" con "Poker retornable x 330 cm3". */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const grams = (s: string) => {
    const out = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) out.set(s.slice(i, i + 2), (out.get(s.slice(i, i + 2)) ?? 0) + 1);
    return out;
  };
  const ga = grams(a), gb = grams(b);
  let hit = 0;
  ga.forEach((n, g) => { hit += Math.min(n, gb.get(g) ?? 0); });
  return (2 * hit) / (a.length - 1 + b.length - 1);
}

function bestItem(spoken: string, items: InventoryItem[]): InventoryItem | null {
  const q = normalize(spoken);
  if (!q) return null;
  let best: { item: InventoryItem; score: number } | null = null;
  for (const item of items) {
    const name = normalize(item.name);
    let score = name === q ? 1 : name.includes(q) || q.includes(name) ? 0.8 : similarity(name, q);
    // Que arranque igual pesa: "poker" → "Poker retornable…".
    if (name.startsWith(q)) score = Math.max(score, 0.85);
    if (!best || score > best.score) best = { item, score };
  }
  return best && best.score >= 0.5 ? best.item : null;
}

/**
 * Plan B sin IA: frases del estilo "30 poker a 2500", "20 aguila a 2300 con
 * 2 de cortesía". Se parte por comas o "y", y cada trozo busca cantidad,
 * nombre, precio, cortesía y descuento.
 */
function parseLocally(transcript: string, items: InventoryItem[]): VoicePurchasePlan {
  const chunks = transcript.split(/,|\by\b|\bmás\b|\bmas\b/i).map((c) => c.trim()).filter(Boolean);
  const lines: VoicePurchasePlan["lines"] = [];
  const unknown: string[] = [];
  for (const chunk of chunks) {
    const words = chunk.split(/\s+/);
    const qty = parseQuantity(words[0]) ?? 1;
    const rest = parseQuantity(words[0]) != null ? words.slice(1).join(" ") : chunk;
    const price = rest.match(/\ba\s+\$?\s*([\d.,]+)/i);
    const bonus = rest.match(/([\d]+|una?|dos|tres|cuatro|cinco)\s+(?:de\s+)?(?:cortes[ií]a|regalad[oa]s?|gratis)/i);
    const disc = rest.match(/descuento\s+(?:de\s+)?\$?\s*([\d.,]+)/i) ?? rest.match(/\$?\s*([\d.,]+)\s+(?:de\s+)?descuento/i);
    const name = rest.replace(/\ba\s+\$?[\d.,]+.*$/i, "").replace(/con\s+.*$/i, "").trim();
    const item = bestItem(name, items);
    if (!item) { if (name) unknown.push(name); continue; }
    lines.push({
      name: item.name,
      quantity: qty,
      unitCost: price ? Number(price[1].replace(/\./g, "").replace(",", ".")) : undefined,
      bonusQty: bonus ? (parseQuantity(bonus[1]) ?? undefined) : undefined,
      discount: disc ? Number(disc[1].replace(/\./g, "").replace(",", ".")) : undefined,
    });
  }
  return { supplier: null, invoiceNumber: null, lines, unknown, ai: false };
}

interface Draft {
  key: string;
  item: InventoryItem;
  quantity: number;
  unitCost: number;
  bonusQty: number;
  discount: number;
}

export function VoicePurchase({
  suppliers,
  inventory,
  onApply,
}: {
  suppliers: Supplier[];
  inventory: InventoryItem[];
  onApply: (result: { supplierId?: string; invoiceNumber?: string; lines: PurchaseLine[] }) => void;
}) {
  const { has } = useFeatures();
  const { supported, listening, transcript, getTranscript, start, stop, reset } = useSpeechRecognition();
  const [thinking, setThinking] = useState(false);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [supplierId, setSupplierId] = useState<string | undefined>();
  const [invoiceNumber, setInvoiceNumber] = useState<string | undefined>();
  const [unknown, setUnknown] = useState<string[]>([]);
  const [localOnly, setLocalOnly] = useState(false);

  if (!has("voice") && !has("ai")) return null;
  if (!supported) return null;

  const interpret = async () => {
    const text = getTranscript().trim();
    if (!text) return;
    setThinking(true);
    let plan: VoicePurchasePlan;
    try {
      const res = await fetch("/api/ai/voice-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: text,
          inventory: inventory.map((i) => i.name),
          suppliers: suppliers.filter((s) => s.active).map((s) => s.name),
        }),
      });
      plan = (await res.json()) as VoicePurchasePlan;
      if (!plan.ai) plan = parseLocally(text, inventory);
    } catch {
      plan = parseLocally(text, inventory);
    }
    setLocalOnly(!plan.ai);
    const byName = new Map(inventory.map((i) => [i.name, i]));
    setDrafts(
      plan.lines
        .map((l, i) => {
          const item = byName.get(l.name);
          if (!item) return null;
          return {
            key: `${item.id}-${i}`,
            item,
            quantity: l.quantity,
            unitCost: l.unitCost ?? item.cost,
            bonusQty: l.bonusQty ?? 0,
            discount: l.discount ?? 0,
          };
        })
        .filter((d): d is Draft => d !== null)
    );
    const sup = plan.supplier ? suppliers.find((s) => s.name === plan.supplier) : undefined;
    setSupplierId(sup ? String(sup.id) : undefined);
    setInvoiceNumber(plan.invoiceNumber ?? undefined);
    setUnknown(plan.unknown);
    setThinking(false);
  };

  const apply = () => {
    if (!drafts?.length) return;
    onApply({
      supplierId,
      invoiceNumber,
      lines: drafts.map((d) => ({
        inventoryId: String(d.item.id),
        name: d.item.name,
        unit: d.item.unit,
        quantity: d.quantity,
        unitCost: d.unitCost,
        taxRate: 0,
        bonusQty: d.bonusQty,
        discount: d.discount,
      })),
    });
    toast.success(`${drafts.length} ${drafts.length === 1 ? "insumo cargado" : "insumos cargados"} al formulario`);
    setDrafts(null);
    reset();
  };

  const discard = () => { setDrafts(null); setUnknown([]); reset(); };

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onPointerDown={(e) => { e.preventDefault(); if (!listening && !thinking) { setDrafts(null); start(); } }}
          onPointerUp={() => { if (listening) { stop(); setTimeout(interpret, 350); } }}
          onPointerLeave={() => { if (listening) { stop(); setTimeout(interpret, 350); } }}
          disabled={thinking}
          className={cn(
            "flex h-10 flex-1 select-none items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors",
            listening ? "border-destructive bg-destructive text-destructive-foreground" : "border-primary/40 bg-background hover:bg-muted"
          )}
        >
          {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {thinking ? "Interpretando…" : listening ? "Suelta para terminar" : "Mantén pulsado y dicta la compra"}
        </button>
      </div>
      {(listening || transcript) && !drafts && (
        <p className="text-xs italic text-muted-foreground">“{transcript || "…"}”</p>
      )}
      {!listening && !drafts && !transcript && (
        <p className="text-[11px] text-muted-foreground">
          Ej.: “A Bavaria, treinta Poker a dos mil quinientos con dos de cortesía, y veinte Águila a dos mil trescientos con diez mil de descuento”.
        </p>
      )}

      {drafts && (
        <div className="space-y-1.5">
          {localOnly && (
            <p className="flex items-center gap-1 text-[11px] text-amber-600"><AlertTriangle className="h-3 w-3" /> Sin IA disponible: interpretado con reglas locales, revisa bien.</p>
          )}
          {supplierId && <p className="text-xs">Proveedor: <b>{suppliers.find((s) => String(s.id) === supplierId)?.name}</b></p>}
          {drafts.length === 0 && <p className="text-xs text-muted-foreground">No reconocí ningún insumo del inventario.</p>}
          {drafts.map((d) => (
            <div key={d.key} className="flex items-center justify-between gap-2 rounded-lg bg-background px-2.5 py-1.5 text-xs">
              <span className="min-w-0 flex-1 truncate font-medium">{d.item.name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatQty(d.quantity)} {d.item.unit} × {formatCurrency(d.unitCost)}
                {d.bonusQty > 0 && <> · +{formatQty(d.bonusQty)} cortesía</>}
                {d.discount > 0 && <> · −{formatCurrency(d.discount)}</>}
              </span>
              <button type="button" onClick={() => setDrafts((ds) => ds?.filter((x) => x.key !== d.key) ?? null)} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {unknown.length > 0 && (
            <p className="text-[11px] text-muted-foreground">No está en el inventario: {unknown.join(", ")}</p>
          )}
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={apply} disabled={drafts.length === 0}><Check className="h-4 w-4" /> Cargar al formulario</Button>
            <Button size="sm" variant="ghost" onClick={discard}>Descartar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
