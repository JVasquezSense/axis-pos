"use client";

import { useRef, useState } from "react";
import { ImagePlus, ScanLine, Check, AlertCircle, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { Category, Product } from "@/types";
import type { ScannedProduct } from "@/app/api/ai/menu-scan/route";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uid } from "@/store/menu.store";

const CATEGORY_EMOJI: Record<string, string> = {
  entradas: "🥗",
  principales: "🍽️",
  postres: "🍰",
  bebidas: "🥤",
  otros: "🍴",
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

export function MenuScanDialog({
  open,
  onOpenChange,
  categories,
  onImport,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: Category[];
  onImport: (products: Product[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftProduct[]>([]);

  const defaultCatId = categories[0]?.id ?? "";

  const reset = () => {
    setPreview(null);
    setLoading(false);
    setError(null);
    setDrafts([]);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
      setDrafts([]);
      setError(null);
    };
    reader.readAsDataURL(file);
    // reset input so same file can be reselected
    e.target.value = "";
  };

  const scan = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    setDrafts([]);
    try {
      const res = await fetch("/api/ai/menu-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      if (!data.products?.length) {
        setError("La IA no detectó productos en la imagen. Intenta con una foto más nítida.");
        return;
      }
      const mapped: DraftProduct[] = (data.products as ScannedProduct[]).map((p) => {
        // best-match category by hint
        const hint = p.categoryHint?.toLowerCase() ?? "";
        const matched = categories.find((c) => c.name.toLowerCase().includes(hint) || hint.includes(c.name.toLowerCase()));
        return {
          ...p,
          _id: uid("scan"),
          _selected: true,
          _categoryId: matched?.id ?? defaultCatId,
          _price: p.price > 0 ? p.price : 0,
        };
      });
      setDrafts(mapped);
    } catch {
      setError("Error al contactar la IA. Verifica conexión.");
    } finally {
      setLoading(false);
    }
  };

  const patch = (id: string, changes: Partial<DraftProduct>) =>
    setDrafts((d) => d.map((x) => (x._id === id ? { ...x, ...changes } : x)));

  const toggleAll = (v: boolean) => setDrafts((d) => d.map((x) => ({ ...x, _selected: v })));

  const selectedCount = drafts.filter((d) => d._selected).length;

  const doImport = () => {
    const toCreate: Product[] = drafts
      .filter((d) => d._selected && d.name.trim())
      .map((d) => ({
        id: uid("p"),
        name: d.name.trim(),
        description: d.description ?? "",
        price: d._price,
        category: d._categoryId,
        image: guessEmoji(d.categoryHint ?? ""),
        tags: d.tags ?? [],
        available: true,
        prepMinutes: 15,
        popular: false,
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
            <ScanLine className="h-5 w-5 text-primary" />
            Importar menú desde foto
          </DialogTitle>
          <DialogDescription>
            Sube una foto de tu carta física. La IA extrae los platos automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
          {/* Upload área */}
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <button
                onClick={() => fileRef.current?.click()}
                className="group relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/40 transition-colors hover:border-primary hover:bg-primary/5"
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Menú" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImagePlus className="h-7 w-7" />
                    <span className="text-[10px] font-medium">Subir foto</span>
                  </div>
                )}
              </button>
              {preview && (
                <button
                  onClick={() => { setPreview(null); setDrafts([]); setError(null); }}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Foto clara de la carta física, digital o pizarrón.
                La IA detecta nombres, descripciones y precios.
              </p>
              <Button
                onClick={scan}
                disabled={!preview || loading}
                className="w-fit"
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analizando…</>
                ) : (
                  <><ScanLine className="mr-2 h-4 w-4" /> Analizar foto</>
                )}
              </Button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Productos detectados */}
          {drafts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {drafts.length} productos detectados
                </p>
                <div className="flex gap-2">
                  <button onClick={() => toggleAll(true)} className="text-xs text-primary hover:underline">Todos</button>
                  <span className="text-xs text-muted-foreground">·</span>
                  <button onClick={() => toggleAll(false)} className="text-xs text-muted-foreground hover:underline">Ninguno</button>
                </div>
              </div>

              <div className="space-y-2">
                {drafts.map((d) => (
                  <div
                    key={d._id}
                    className={`rounded-xl border p-3 transition-colors ${d._selected ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30 opacity-60"}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => patch(d._id, { _selected: !d._selected })}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${d._selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                      >
                        {d._selected && <Check className="h-3 w-3" />}
                      </button>

                      <div className="min-w-0 flex-1 space-y-2">
                        {/* Nombre + precio */}
                        <div className="flex items-center gap-2">
                          <Input
                            value={d.name}
                            onChange={(e) => patch(d._id, { name: e.target.value })}
                            className="h-8 flex-1 text-sm font-medium"
                            placeholder="Nombre del producto"
                          />
                          <div className="relative w-32 shrink-0">
                            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                            <Input
                              type="number"
                              min={0}
                              value={d._price}
                              onChange={(e) => patch(d._id, { _price: Number(e.target.value) })}
                              className="h-8 pl-5 text-sm"
                            />
                          </div>
                        </div>

                        {/* Descripción */}
                        <Input
                          value={d.description}
                          onChange={(e) => patch(d._id, { description: e.target.value })}
                          className="h-8 text-xs text-muted-foreground"
                          placeholder="Descripción…"
                        />

                        {/* Categoría + tags */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Select
                            value={d._categoryId}
                            onValueChange={(v) => patch(d._id, { _categoryId: v })}
                          >
                            <SelectTrigger className="h-7 w-40 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((c) => (
                                <SelectItem key={c.id} value={c.id} className="text-xs">
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {d.tags?.map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px]">
                              {t}
                            </Badge>
                          ))}
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
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button
            onClick={doImport}
            disabled={selectedCount === 0}
          >
            Importar {selectedCount > 0 ? `${selectedCount} producto${selectedCount !== 1 ? "s" : ""}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
