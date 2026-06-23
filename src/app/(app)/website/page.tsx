"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, ExternalLink, Wifi, QrCode } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StoreQR } from "@/components/shared/store-qr";
import { WebOrdersFeed } from "@/components/website/web-orders-feed";

export default function WebsitePage() {
  const [origin, setOrigin] = useState("https://axispos.co");
  useEffect(() => setOrigin(window.location.origin), []);
  const siteUrl = `${origin}/restaurant/demo-burger`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Página web del restaurante"
        description="Tu e-commerce, código QR y pedidos en línea"
        icon={<Globe className="h-5 w-5" />}
        actions={
          <Button asChild>
            <Link href="/restaurant/demo-burger" target="_blank">
              <ExternalLink className="h-4 w-4" /> Abrir sitio
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Preview */}
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Vista previa del sitio</CardTitle>
            <Badge variant="success" className="gap-1.5">
              <Wifi className="h-3.5 w-3.5" /> Publicado
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 truncate rounded bg-background px-2 py-0.5 text-xs text-muted-foreground">{siteUrl}</span>
              </div>
              <div className="relative bg-gradient-to-br from-primary/15 via-orange-500/10 to-transparent p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-2xl">🍔</div>
                  <div>
                    <p className="text-lg font-black">Demo Burger</p>
                    <p className="text-xs text-muted-foreground">Pedidos en línea · 4.8 ★</p>
                  </div>
                </div>
                <p className="mt-4 max-w-sm text-xl font-bold">Las mejores hamburguesas artesanales de la ciudad 🔥</p>
                <Button asChild className="mt-5">
                  <Link href="/restaurant/demo-burger" target="_blank">
                    Ver experiencia completa <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Stat label="Visitas hoy" value="1.842" />
              <Stat label="Conversión" value="6.4%" />
              <Stat label="Pedidos web" value="38" />
            </div>
          </CardContent>
        </Card>

        {/* QR de la tienda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-4 w-4" /> Código QR de la tienda
            </CardTitle>
            <p className="text-sm text-muted-foreground">Imprímelo en mesas, vitrina o flyers para que pidan al instante.</p>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <StoreQR url={siteUrl} name="Demo Burger" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos web en vivo</CardTitle>
          <p className="text-sm text-muted-foreground">Verifica comprobantes y aprueba pagos (también en el módulo «Pedidos web»).</p>
        </CardHeader>
        <CardContent>
          <WebOrdersFeed />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
