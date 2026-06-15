"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Product, ModifierOption } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/shared/product-image";
import { useOrderStore } from "@/store/order.store";
import { cn, formatCurrency } from "@/lib/utils";

export function ModifierDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const addProduct = useOrderStore((s) => s.addProduct);
  const [selected, setSelected] = useState<Record<string, ModifierOption[]>>({});
  const [notes, setNotes] = useState("");

  if (!product) return null;

  const groups = product.modifiers ?? [];
  const chosen = Object.values(selected).flat();
  const extra = chosen.reduce((s, m) => s + m.price, 0);

  const toggle = (groupId: string, opt: ModifierOption, multiple: boolean) => {
    setSelected((prev) => {
      const current = prev[groupId] ?? [];
      if (multiple) {
        const exists = current.find((o) => o.id === opt.id);
        return { ...prev, [groupId]: exists ? current.filter((o) => o.id !== opt.id) : [...current, opt] };
      }
      return { ...prev, [groupId]: [opt] };
    });
  };

  const confirm = () => {
    addProduct(product, chosen, notes || undefined);
    toast.success(`${product.name} agregado al pedido`);
    onOpenChange(false);
    setSelected({});
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <div className="flex items-center gap-4 border-b border-border p-5">
          <ProductImage emoji={product.image} category={product.category} size="sm" className="h-16 w-16" />
          <div className="flex-1">
            <DialogHeader>
              <DialogTitle>{product.name}</DialogTitle>
              <DialogDescription className="line-clamp-2">{product.description}</DialogDescription>
            </DialogHeader>
            <p className="mt-1 text-base font-bold text-primary">{formatCurrency(product.price)}</p>
          </div>
        </div>

        <div className="scrollbar-thin max-h-[50vh] space-y-5 overflow-y-auto p-5">
          {groups.map((g) => (
            <div key={g.id}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">{g.name}</p>
                <Badge variant={g.required ? "default" : "secondary"}>
                  {g.required ? "Requerido" : "Opcional"}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {g.options.map((opt) => {
                  const active = (selected[g.id] ?? []).some((o) => o.id === opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggle(g.id, opt, g.multiple)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors",
                        active ? "border-primary bg-primary/5 text-foreground" : "border-border hover:bg-muted"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-full border",
                            active ? "border-primary bg-primary" : "border-muted-foreground/40"
                          )}
                        >
                          {active && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                        </span>
                        {opt.name}
                      </span>
                      {opt.price > 0 && <span className="text-muted-foreground">+{formatCurrency(opt.price)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <p className="mb-2 text-sm font-semibold">Observaciones</p>
            <Input
              placeholder="Ej: sin cebolla, término medio…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="border-t border-border p-4">
          <Button className="w-full" size="lg" onClick={confirm}>
            Agregar · {formatCurrency(product.price + extra)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
