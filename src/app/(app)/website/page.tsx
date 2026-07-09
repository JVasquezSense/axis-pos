"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Globe, ExternalLink, Wifi, QrCode, ImagePlus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StoreQR } from "@/components/shared/store-qr";
import { WebOrdersFeed } from "@/components/website/web-orders-feed";
import { WhatsAppBotSection } from "@/components/website/whatsapp-config";
import { useAppStore } from "@/store/app.store";

export default function WebsitePage() {
  const restaurant = useAppStore((s) => s.restaurant);
  const updateRestaurant = useAppStore((s) => s.updateRestaurant);
  const [origin, setOrigin] = useState("https://axispos.co");
  useEffect(() => setOrigin(window.location.origin), []);
  const siteUrl = `${origin}/restaurant/${restaurant.slug}`;
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagen muy grande", { description: "Máximo 5 MB" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateRestaurant({ banner: String(reader.result) });
      toast.success("Banner actualizado");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Página web del restaurante"
        description="Tu e-commerce, código QR y pedidos en línea"
        icon={<Globe className="h-5 w-5" />}
        actions={
          <Button asChild>
            <Link href={`/restaurant/${restaurant.slug}`} target="_blank">
              <ExternalLink className="h-4 w-4" /> Abrir sitio
            </Link>
          </Button>
        }
      />

      {/* Personalización */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Personalización
          </CardTitle>
          <p className="text-sm text-muted-foreground">Configura el nombre y banner que ven tus clientes en la página web.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Nombre del restaurante</label>
              <Input
                value={restaurant.name}
                onChange={(e) => updateRestaurant({ name: e.target.value })}
                placeholder="Mi Restaurante"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Logo (emoji)</label>
              <Input
                value={restaurant.logo}
                onChange={(e) => updateRestaurant({ logo: e.target.value })}
                placeholder="🍔"
                className="w-20 text-center text-xl"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Banner superior</label>
            {restaurant.banner ? (
              <div className="group relative overflow-hidden rounded-xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={restaurant.banner} alt="Banner" className="h-36 w-full object-cover sm:h-48" />
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button size="sm" variant="secondary" onClick={() => bannerInputRef.current?.click()}>
                    <ImagePlus className="mr-1 h-4 w-4" /> Cambiar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => { updateRestaurant({ banner: "" }); toast.success("Banner eliminado"); }}>
                    <Trash2 className="mr-1 h-4 w-4" /> Quitar
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => bannerInputRef.current?.click()}
                className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 sm:h-48"
              >
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm font-medium">Subir banner (recomendado: 1200×400)</span>
                <span className="text-xs">JPG o PNG · máx 5 MB</span>
              </button>
            )}
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
          </div>
        </CardContent>
      </Card>

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
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-2xl">{restaurant.logo}</div>
                  <div>
                    <p className="text-lg font-black">{restaurant.name}</p>
                    <p className="text-xs text-muted-foreground">Pedidos en línea · 4.8 ★</p>
                  </div>
                </div>
                <p className="mt-4 max-w-sm text-xl font-bold">Pide en línea y recibe tu pedido en minutos 🔥</p>
                <Button asChild className="mt-5">
                  <Link href={`/restaurant/${restaurant.slug}`} target="_blank">
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
            <StoreQR url={siteUrl} name={restaurant.name} />
          </CardContent>
        </Card>
      </div>

      <WhatsAppBotSection />

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
