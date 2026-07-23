"use client";

import { StoreQR } from "@/components/shared/store-qr";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { RestaurantTable } from "@/types";

/**
 * Backlog #8: muestra un QR por cada mesa del restaurante, apuntando a la carta
 * pública con el parámetro ?table=N para que el pedido se asocie a la mesa.
 */
export function TableQrDialog({
  open, onOpenChange, tables, slug,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tables: RestaurantTable[];
  slug: string;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>QR por mesa · pedidos web</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Cada mesa tiene un QR único. El cliente escanea, ve la carta y su pedido llega directo a cocina
          asociado a la mesa.
        </p>
        {tables.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No hay mesas creadas</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {tables.map((t) => (
              <div key={t.id} className="flex flex-col items-center rounded-xl border border-border p-3">
                <p className="mb-2 text-sm font-semibold">Mesa {t.number}</p>
                <StoreQR
                  url={`${origin}/restaurant/${slug}?table=${t.number}`}
                  name={`mesa-${t.number}`}
                  size={120}
                />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
