import { Button } from "@/shared/components/ui/button";
import { DashboardPage } from "@/shared/components/layout/dashboard-page";
import { Link } from "@/i18n/navigation";

type PathwayDetailPageProps = {
  pathwayId: string;
};

export function PathwayDetailPage({ pathwayId }: PathwayDetailPageProps) {
  return (
    <DashboardPage
      title="Editor de jornada"
      description={
        <>
          ID: <code className="bg-muted rounded px-1 py-0.5 text-xs">{pathwayId}</code> — canvas XYFlow e{" "}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">graphJson</code> no backend.
        </>
      }
      actions={
        <Button
          nativeButton={false}
          variant="outline"
          size="sm"
          render={<Link href="/dashboard/pathways" />}
        >
          Voltar às jornadas
        </Button>
      }
    >
      <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
        <p className="text-muted-foreground text-sm">
          Área do editor (nodes/edges), painel por etapa e publicação de versão.
        </p>
      </div>
    </DashboardPage>
  );
}
