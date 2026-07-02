"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { NAV_ITEMS, NAV_GROUPS } from "@/lib/nav";
import { ROLE_NAV } from "@/lib/roles";
import { useAppStore } from "@/store/app.store";
import { useAuthStore } from "@/store/auth.store";
import { Icon } from "@/components/shared/icon";
import { LogoMark } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, role } = useAppStore();
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const allowed = ROLE_NAV[role] ?? ROLE_NAV["admin"];
  const items = NAV_ITEMS.filter((i) => allowed.includes(i.key) && (i.key !== "admin" || isSuperAdmin));

  return (
    <aside
      className={cn(
        "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 lg:flex",
        sidebarCollapsed ? "w-[76px]" : "w-64"
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 shadow-lg ring-1 ring-white/10">
          <LogoMark className="h-6 w-6" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <p className="text-sm font-black leading-tight tracking-[0.15em] text-white">AXIS</p>
              <p className="text-[10px] font-semibold leading-tight tracking-[0.3em] text-gold">POS SYSTEM</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => {
          const groupItems = items.filter((i) => i.group === group);
          if (!groupItems.length) return null;
          return (
            <div key={group}>
              {!sidebarCollapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {group}
                </p>
              )}
              <div className="space-y-1">
                {groupItems.map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      data-tour={item.key}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent text-white shadow-sm"
                          : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white",
                        sidebarCollapsed && "justify-center"
                      )}
                    >
                      <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                      {!sidebarCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {!sidebarCollapsed && item.badge === "live" && (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-400">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                          Live
                        </span>
                      )}
                      {active && (
                        <motion.span
                          layoutId="sidebar-active"
                          className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-white"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Collapse */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-white/5 hover:text-white"
        >
          {sidebarCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          {!sidebarCollapsed && <span>Colapsar</span>}
        </button>
      </div>
    </aside>
  );
}
