import { AppShell } from "@/layouts/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { DataProvider } from "@/components/data-provider";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DataProvider>
        <AppShell>{children}</AppShell>
      </DataProvider>
    </AuthGuard>
  );
}
