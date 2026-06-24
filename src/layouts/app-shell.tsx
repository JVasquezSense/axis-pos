"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { AxisAI } from "@/components/ai/axis-ai";
import { useAppInit } from "@/hooks/use-app-init";

export function AppShell({ children }: { children: React.ReactNode }) {
  useAppInit();

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 px-4 py-6 lg:px-6">{children}</main>
      </div>
      <AxisAI />
    </div>
  );
}
