import { ClientsList } from "@/features/clients/app/components/clients-list";
import { ClientsListPageToolbar } from "@/features/clients/app/components/clients-list-page-toolbar";
import { DashboardPage } from "@/shared/components/layout/dashboard-page";
import { getTranslations } from "next-intl/server";

export async function ClientsListPage() {
  const t = await getTranslations("clients.list");

  return (
    <DashboardPage title={t("title")} description={t("description")}>
      <ClientsListPageToolbar />
      <ClientsList />
    </DashboardPage>
  );
}
