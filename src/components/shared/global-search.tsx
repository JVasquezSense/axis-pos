"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { ROLE_NAV } from "@/lib/roles";
import { PRODUCTS } from "@/mock/menu";
import { useAppStore } from "@/store/app.store";
import { Icon } from "@/components/shared/icon";
import { ProductImage } from "@/components/shared/product-image";
import { cn, formatCurrency } from "@/lib/utils";

export function GlobalSearch() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const ql = q.trim().toLowerCase();
  const allowed = ROLE_NAV[role];
  const pages = ql ? NAV_ITEMS.filter((n) => allowed.includes(n.key) && n.label.toLowerCase().includes(ql)) : [];
  const products = ql ? PRODUCTS.filter((p) => p.name.toLowerCase().includes(ql)).slice(0, 5) : [];
  const hasResults = pages.length > 0 || products.length > 0;

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  const onSubmit = () => {
    if (pages[0]) go(pages[0].href);
    else if (products[0]) go("/orders");
  };

  return (
    <div ref={ref} className="relative hidden max-w-md flex-1 md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        placeholder="Buscar módulos, productos…"
        className="h-9 w-full rounded-lg border border-border bg-muted/50 pl-9 pr-4 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
      />

      {open && ql.length > 0 && (
        <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          {!hasResults && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sin resultados para “{q}”.</p>}

          {pages.length > 0 && (
            <div className="p-1.5">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Módulos</p>
              {pages.map((p) => (
                <button
                  key={p.key}
                  onClick={() => go(p.href)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  <Icon name={p.icon} className="h-4 w-4 text-muted-foreground" />
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {products.length > 0 && (
            <div className="border-t border-border p-1.5">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Productos</p>
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => go("/orders")}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  <ProductImage emoji={p.image} category={p.category} size="sm" className="h-7 w-7 shrink-0" />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{formatCurrency(p.price)}</span>
                </button>
              ))}
            </div>
          )}

          {hasResults && (
            <div className="flex items-center justify-end gap-1 border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
              <CornerDownLeft className="h-3 w-3" /> Enter para abrir
            </div>
          )}
        </div>
      )}
    </div>
  );
}
