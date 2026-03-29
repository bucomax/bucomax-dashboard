import { ClientDetailView } from "@/features/clients/app/components/client-detail-view";
import { DashboardPage } from "@/shared/components/layout/dashboard-page";

type ClientDetailPageProps = {
  clientId: string;
};

export async function ClientDetailPage({ clientId }: ClientDetailPageProps) {
  return (
    <DashboardPage>
      <ClientDetailView clientId={clientId} />
    </DashboardPage>
  );
}
