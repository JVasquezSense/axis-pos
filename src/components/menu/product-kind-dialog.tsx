"use client";

import { CupSoda, ChefHat } from "lucide-react";
import type { Product } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ProductKind = NonNullable<Product["kind"]>;

export const KINDS: {
  id: ProductKind;
  label: string;
  desc: string;
  examples: string;
  icon: typeof CupSoda;
  /** Color del icono: distinguir de un vistazo pesa más que leer los dos textos. */
  tone: string;
}[] = [
  {
    id: "simple",
    label: "Producto simple",
    desc: "Se vende tal cual y descuenta su propio insumo del inventario.",
    examples: "Una Coca-Cola, una cerveza, una cajetilla de cigarrillos.",
    icon: CupSoda,
    tone: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  },
  {
    id: "compound",
    label: "Requiere insumos",
    desc: "Se prepara y descuenta los ingredientes de su ficha técnica.",
    examples: "Una hamburguesa, un roll de sushi, un cóctel.",
    icon: ChefHat,
    tone: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  },
];

/**
 * Primer paso al crear un producto: cómo descuenta del inventario.
 *
 * Se pregunta antes y no dentro del formulario porque cada tipo lleva a una
 * pantalla distinta —el simple a un formulario corto, el que requiere insumos
 * directo a su ficha técnica— y preguntarlo a mitad de camino obligaba a
 * rehacer lo ya escrito.
 */
export function ProductKindDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (kind: ProductKind) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>¿Qué tipo de producto?</DialogTitle>
          <DialogDescription>Define cómo descuenta del inventario al venderse.</DialogDescription>
        </DialogHeader>

        {/* grid-cols-2 reparte en columnas iguales (minmax(0,1fr)); con w-full y
            min-w-0 en la tarjeta, el texto más largo ya no ensancha su columna
            y las dos quedan del mismo ancho. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => onPick(k.id)}
              className="group flex w-full min-w-0 flex-col items-center gap-3 rounded-3xl border-2 border-border p-6 text-center transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 hover:shadow-lg"
            >
              <span
                className={cn(
                  "flex h-20 w-20 items-center justify-center rounded-3xl transition-transform group-hover:scale-105",
                  k.tone
                )}
              >
                <k.icon className="h-10 w-10" strokeWidth={1.75} />
              </span>
              <span className="text-base font-semibold">{k.label}</span>
              <span className="text-xs leading-snug text-muted-foreground">{k.desc}</span>
              <span className="mt-auto text-[11px] leading-snug text-muted-foreground/70">{k.examples}</span>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
