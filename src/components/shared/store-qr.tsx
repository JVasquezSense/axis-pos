"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Genera (offline) el código QR de una tienda apuntando a su sitio web. */
export function StoreQR({
  url,
  name,
  size = 200,
  className,
}: {
  url: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: size * 2,
      margin: 1,
      color: { dark: "#1b2230", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then(setSrc)
      .catch(() => setSrc(""));
  }, [url, size]);

  const download = () => {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `qr-${name.toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="rounded-2xl border border-border bg-white p-3 shadow-sm">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={`QR ${name}`} width={size} height={size} className="rounded-lg" />
        ) : (
          <div className="flex items-center justify-center text-muted-foreground" style={{ width: size, height: size }}>
            <QrCode className="h-10 w-10" />
          </div>
        )}
      </div>
      <p className="mt-2 max-w-[220px] truncate text-center text-xs text-muted-foreground">{url}</p>
      <Button variant="outline" size="sm" className="mt-2" onClick={download} disabled={!src}>
        <Download className="h-4 w-4" /> Descargar QR
      </Button>
    </div>
  );
}
