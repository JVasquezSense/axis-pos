"use client";

import Link from "next/link";
import { ShoppingBag, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { WebOrdersFeed } from "@/components/website/web-orders-feed";

export default function WebOrdersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos web"
        description="Verifica el comprobante, aprueba el pago y envía a preparación"
        icon={<ShoppingBag className="h-5 w-5" />}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/restaurant/demo-burger" target="_blank">
              <ExternalLink className="h-4 w-4" /> Abrir sitio
            </Link>
          </Button>
        }
      />
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-xs text-muted-foreground">
        💡 Flujo: el cliente paga y sube el comprobante → aquí <strong className="text-foreground">verificas y apruebas</strong> →
        el pedido pasa automáticamente a <strong className="text-foreground">cocina (KDS)</strong> para su preparación → luego lo despachas.
      </div>
      <WebOrdersFeed />
    </div>
  );
}
