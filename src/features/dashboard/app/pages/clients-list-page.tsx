import { ClientsList } from "@/features/clients/app/components/clients-list";
import { ClientsListPageToolbar } from "@/features/clients/app/components/clients-list-page-toolbar";
import { DashboardPage } from "@/shared/components/layout/dashboard-page";

export async function ClientsListPage() {
  return (
    <DashboardPage>
      <ClientsListPageToolbar />
      <ClientsList />
    </DashboardPage>
  );
}
