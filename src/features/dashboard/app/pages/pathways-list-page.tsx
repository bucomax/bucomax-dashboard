import { PathwaysList } from "@/features/pathways/app/components/pathways-list";
import { DashboardPage } from "@/shared/components/layout/dashboard-page";
import { getTranslations } from "next-intl/server";

export async function PathwaysListPage() {
  const t = await getTranslations("pathways.list");

  return (
    <DashboardPage title={t("title")} description={t("description")}>
      <PathwaysList />
    </DashboardPage>
  );
}
