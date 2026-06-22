"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { NAV_ITEMS, NAV_GROUPS } from "@/lib/nav";
import { ROLE_NAV } from "@/lib/roles";
import { useAppStore } from "@/store/app.store";
import { Icon } from "@/components/shared/icon";
import { LogoMark } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const role = useAppStore((s) => s.role);
  const items = NAV_ITEMS.filter((i) => ROLE_NAV[role].includes(i.key));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
        <div className="flex h-16 items-center gap-3 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
            <LogoMark className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-black tracking-[0.15em] text-white">AXIS</p>
            <p className="text-[10px] font-semibold tracking-[0.3em] text-gold">POS SYSTEM</p>
          </div>
        </div>
        <nav className="scrollbar-thin space-y-5 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => {
            const groupItems = items.filter((i) => i.group === group);
            if (!groupItems.length) return null;
            return (
              <div key={group}>
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {group}
                </p>
                <div className="space-y-1">
                  {groupItems.map((item) => {
                    const active = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent text-white"
                            : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <Icon name={item.icon} className="h-5 w-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
