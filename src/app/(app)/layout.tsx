import { AppShell } from "@/layouts/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { DataProvider } from "@/components/data-provider";
import { FeatureGuard } from "@/components/feature-guard";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DataProvider>
        <AppShell>
          <FeatureGuard>{children}</FeatureGuard>
        </AppShell>
      </DataProvider>
    </AuthGuard>
  );
}
