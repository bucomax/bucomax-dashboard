import { NewClientWizard } from "@/features/clients/app/components/new-client-wizard";
import { Link } from "@/i18n/navigation";
import { DashboardPage } from "@/shared/components/layout/dashboard-page";
import { Button } from "@/shared/components/ui/button";
import { getTranslations } from "next-intl/server";

export async function ClientsNewPage() {
  const t = await getTranslations("clients.wizard");

  return (
    <DashboardPage
      title={t("title")}
      description={t("description")}
      actions={
        <Button
          nativeButton={false}
          variant="outline"
          size="sm"
          render={<Link href="/dashboard/clients" />}
        >
          {t("backToList")}
        </Button>
      }
    >
      <NewClientWizard />
    </DashboardPage>
  );
}
