import { AppCatalogGrid } from "@/features/apps/app/components/app-catalog-grid";
import { DashboardPage } from "@/shared/components/layout/dashboard-page";
import { getTranslations } from "next-intl/server";

export async function AppsCatalogPage() {
  const t = await getTranslations("apps.catalog");

  return (
    <DashboardPage title={t("title")} description={t("description")}>
      <AppCatalogGrid />
    </DashboardPage>
  );
}
