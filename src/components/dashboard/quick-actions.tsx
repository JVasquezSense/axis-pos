"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/utils";

export interface QuickAction {
  label: string;
  description?: string;
  icon: string;
  href: string;
  color: keyof typeof TONES;
  primary?: boolean;
}

const TONES = {
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  primary: "bg-primary/10 text-primary",
};

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {actions.map((a, i) => (
        <motion.div
          key={a.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Link
            href={a.href}
            className={cn(
              "group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md",
              a.primary
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card"
            )}
          >
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl",
                a.primary ? "bg-primary-foreground/15 text-primary-foreground" : TONES[a.color]
              )}
            >
              <Icon name={a.icon} className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold leading-tight">{a.label}</p>
              {a.description && (
                <p className={cn("text-xs", a.primary ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {a.description}
                </p>
              )}
            </div>
            <ArrowRight
              className={cn(
                "absolute right-4 top-4 h-4 w-4 transition-transform group-hover:translate-x-0.5",
                a.primary ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
            />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
