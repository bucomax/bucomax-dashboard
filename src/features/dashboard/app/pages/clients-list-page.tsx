import { ClientsList } from "@/features/clients/app/components/clients-list";
import { Link } from "@/i18n/navigation";
import { DashboardPage } from "@/shared/components/layout/dashboard-page";
import { Button } from "@/shared/components/ui/button";
import { getTranslations } from "next-intl/server";

export async function ClientsListPage() {
  const t = await getTranslations("clients.list");

  return (
    <DashboardPage
      title={t("title")}
      description={t("description")}
      actions={
        <Button nativeButton={false} size="sm" render={<Link href="/dashboard/clients/new" />}>
          {t("newPatient")}
        </Button>
      }
    >
      <ClientsList />
    </DashboardPage>
  );
}
