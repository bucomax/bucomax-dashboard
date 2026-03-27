import { Button } from "@/shared/components/ui/button";
import { DashboardPage } from "@/shared/components/layout/dashboard-page";
import { Link } from "@/i18n/navigation";

export function PathwaysListPage() {
  return (
    <DashboardPage
      title="Jornadas"
      description={
        <>
          Fluxos clínicos do tenant. APIs:{" "}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">pathways</code>,{" "}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">patient-pathways</code> — editor F8.
        </>
      }
      actions={
        <Button
          nativeButton={false}
          size="sm"
          variant="outline"
          render={<Link href="/dashboard/pathways/exemplo-id" />}
        >
          Abrir exemplo (detalhe)
        </Button>
      }
    >
      <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
        <p className="text-muted-foreground text-sm">
          Lista de fluxos, criar a partir de template e publicação de versões entram aqui.
        </p>
      </div>
    </DashboardPage>
  );
}
