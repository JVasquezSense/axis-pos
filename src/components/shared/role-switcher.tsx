"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { ROLE_LIST, ROLES } from "@/lib/roles";
import { useAppStore } from "@/store/app.store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const DOT: Record<string, string> = {
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  amber: "bg-amber-500",
  cyan: "bg-cyan-500",
  orange: "bg-orange-500",
};

export function RoleSwitcher() {
  const router = useRouter();
  const { role, setRole } = useAppStore();
  const current = ROLES[role];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent">
          <span className={cn("h-2 w-2 rounded-full", DOT[current.color])} />
          <span className="hidden sm:inline">{current.label}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Cambiar vista por rol</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLE_LIST.map((r) => (
          <DropdownMenuItem
            key={r.id}
            onClick={() => {
              setRole(r.id);
              router.push(r.defaultRoute);
            }}
            className="flex items-start gap-3 py-2.5"
          >
            <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", DOT[r.color])} />
            <div className="flex-1">
              <p className="font-medium">{r.label}</p>
              <p className="text-xs text-muted-foreground">{r.description}</p>
            </div>
            {role === r.id && <Check className="mt-0.5 h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
