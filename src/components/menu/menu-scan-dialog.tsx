"use client";

import { useRef, useState } from "react";
import { ImagePlus, ScanLine, Check, AlertCircle, Loader2, X, FileText } from "lucide-react";
import { toast } from "sonner";
import type { Category, Product } from "@/types";
import type { ScannedProduct } from "@/app/api/ai/menu-scan/route";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uid } from "@/store/menu.store";
import { cn } from "@/lib/utils";

const CATEGORY_EMOJI: Record<string, string> = {
  entradas: "🥗", principales: "🍽️", postres: "🍰", bebidas: "🥤", otros: "🍴",
};

function guessEmoji(hint: string): string {
  const h = hint.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (h.includes(key)) return emoji;
  }
  return "🍽️";
}

interface DraftProduct extends ScannedProduct {
  _id: string;
  _selected: boolean;
  _categoryId: string;
  _price: number;
}

type InputMode = "text" | "image";

export function MenuScanDialog({
  open, onOpenChange, categories, onImport,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: Category[];
  onImport: (products: Product[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<InputMode>("text");
  const [preview, setPreview] = useState<string | null>(null);
  const [menuText, setMenuText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftProduct[]>([]);

  const defaultCatId = categories[0]?.id ?? "";

  const reset = () => {
    setPreview(null); setMenuText(""); setLoading(false); setError(null); setDrafts([]);
  };

  const handleClose = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setPreview(ev.target?.result as string); setDrafts([]); setError(null); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const canScan = mode === "text" ? menuText.trim().length > 20 : !!preview;

  const scan = async () => {
    if (!canScan) return;
    setLoading(true); setError(null); setDrafts([]);
    try {
      const body = mode === "image" ? { image: preview } : { text: menuText };
      const res = await fetch("/api/ai/menu-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      if (!data.products?.length) { setError("La IA no detectó productos. Agrega más detalle al texto o usa una foto más nítida."); return; }
      const mapped: DraftProduct[] = (data.products as ScannedProduct[]).map((p) => {
        const hint = p.categoryHint?.toLowerCase() ?? "";
        const matched = categories.find((c) => c.name.toLowerCase().includes(hint) || hint.includes(c.name.toLowerCase()));
        return { ...p, _id: uid("scan"), _selected: true, _categoryId: matched?.id ?? defaultCatId, _price: p.price > 0 ? p.price : 0 };
      });
      setDrafts(mapped);
    } catch { setError("Error al contactar la IA."); }
    finally { setLoading(false); }
  };

  const patch = (id: string, changes: Partial<DraftProduct>) =>
    setDrafts((d) => d.map((x) => (x._id === id ? { ...x, ...changes } : x)));

  const toggleAll = (v: boolean) => setDrafts((d) => d.map((x) => ({ ...x, _selected: v })));

  const selectedCount = drafts.filter((d) => d._selected).length;

  const doImport = () => {
    const toCreate: Product[] = drafts
      .filter((d) => d._selected && d.name.trim())
      .map((d) => ({
        id: uid("p"), name: d.name.trim(), description: d.description ?? "",
        price: d._price, category: d._categoryId, image: guessEmoji(d.categoryHint ?? ""),
        tags: d.tags ?? [], available: true, prepMinutes: 15, popular: false,
      }));
    if (!toCreate.length) return;
    onImport(toCreate);
    toast.success(`${toCreate.length} productos importados`);
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" /> Importar menú con IA
          </DialogTitle>
          <DialogDescription>Pega el texto de tu carta o sube una foto para extraer productos automáticamente.</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
          {/* Tabs modo */}
          <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit">
            {([ { m: "text" as const, icon: <FileText key="icon-text" className="h-4 w-4" />, label: "Pegar texto" }, { m: "image" as const, icon: <ImagePlus key="icon-image" className="h-4 w-4" />, label: "Subir foto" }]).map(({ m, icon, label }) => (
              <button
                key={m}
                onClick={() => { setMode(m); setDrafts([]); setError(null); }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  mode === m ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Input por modo */}
          {mode === "text" ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Texto del menú</label>
              <textarea
                value={menuText}
                onChange={(e) => { setMenuText(e.target.value); setDrafts([]); setError(null); }}
                placeholder={"Copia y pega el texto de tu carta. Ejemplo:\n\nENTRADAS\nCesár $18.000 - Lechuga romana, crutones, parmesano\nAlas BBQ $22.000 - 8 unidades con salsa\n\nPRINCIPALES\nLomo al vino $45.000..."}
                rows={8}
                className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">Incluye nombres, precios y descripciones para mejores resultados.</p>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="group flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/40 transition-colors hover:border-primary hover:bg-primary/5"
                >
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="Menú" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <ImagePlus className="h-7 w-7" /> <span className="text-[10px] font-medium">Subir foto</span>
                    </div>
                  )}
                </button>
                {preview && (
                  <button onClick={() => { setPreview(null); setDrafts([]); setError(null); }} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <p className="text-sm text-muted-foreground">Foto clara de la carta física, digital o pizarrón.</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Nota: requiere un modelo de visión. Si falla, usa la pestaña &ldquo;Pegar texto&rdquo;.
                </p>
              </div>
            </div>
          )}

          {/* Botón analizar */}
          <Button onClick={scan} disabled={!canScan || loading} className="w-fit">
            {loading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analizando…</>
              : <><ScanLine className="mr-2 h-4 w-4" /> Extraer productos con IA</>}
          </Button>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {/* Productos detectados */}
          {drafts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{drafts.length} productos detectados</p>
                <div className="flex gap-2">
                  <button onClick={() => toggleAll(true)} className="text-xs text-primary hover:underline">Todos</button>
                  <span className="text-xs text-muted-foreground">·</span>
                  <button onClick={() => toggleAll(false)} className="text-xs text-muted-foreground hover:underline">Ninguno</button>
                </div>
              </div>
              <div className="space-y-2">
                {drafts.map((d) => (
                  <div key={d._id} className={`rounded-xl border p-3 transition-colors ${d._selected ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30 opacity-60"}`}>
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => patch(d._id, { _selected: !d._selected })}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${d._selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                      >
                        {d._selected && <Check className="h-3 w-3" />}
                      </button>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input value={d.name} onChange={(e) => patch(d._id, { name: e.target.value })} className="h-8 flex-1 text-sm font-medium" placeholder="Nombre" />
                          <div className="relative w-32 shrink-0">
                            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                            <Input type="number" min={0} value={d._price} onChange={(e) => patch(d._id, { _price: Number(e.target.value) })} className="h-8 pl-5 text-sm" />
                          </div>
                        </div>
                        <Input value={d.description} onChange={(e) => patch(d._id, { description: e.target.value })} className="h-8 text-xs text-muted-foreground" placeholder="Descripción…" />
                        <div className="flex flex-wrap items-center gap-2">
                          <Select value={d._categoryId} onValueChange={(v) => patch(d._id, { _categoryId: v })}>
                            <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {categories.map((c) => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {d.tags?.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
          <Button onClick={doImport} disabled={selectedCount === 0}>
            Importar {selectedCount > 0 ? `${selectedCount} producto${selectedCount !== 1 ? "s" : ""}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
