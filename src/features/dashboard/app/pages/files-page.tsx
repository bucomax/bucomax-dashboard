import { DashboardPage } from "@/shared/components/layout/dashboard-page";

export function FilesPage() {
  return (
    <DashboardPage
      title="Arquivos"
      description="Biblioteca de arquivos por tenant (upload via presign R2, metadados em FileAsset)."
    >
      <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
        <p className="text-muted-foreground text-sm">
          Grid ou lista com upload e vínculo a pacientes/etapas.
        </p>
      </div>
    </DashboardPage>
  );
}
