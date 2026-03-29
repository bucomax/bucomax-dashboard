import { DashboardReportsSection } from "@/features/dashboard/app/components/dashboard-reports-section";
import { DashboardPage } from "@/shared/components/layout/dashboard-page";
import { getTranslations } from "next-intl/server";

export async function ReportsPage() {
  const t = await getTranslations("dashboard.reports");

  return (
    <DashboardPage title={t("title")} description={t("description")}>
      <DashboardReportsSection />
    </DashboardPage>
  );
}
