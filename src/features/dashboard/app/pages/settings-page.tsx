import { DashboardPage } from "@/shared/components/layout/dashboard-page";

export function SettingsPage() {
  return (
    <DashboardPage
      title="Configurações"
      description="Time, integrações, webhooks e preferências do tenant (conforme APIs de admin e membros)."
    >
      <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
        <p className="text-muted-foreground text-sm">
          Seções de convites, papéis e integrações serão adicionadas aqui.
        </p>
      </div>
    </DashboardPage>
  );
}
