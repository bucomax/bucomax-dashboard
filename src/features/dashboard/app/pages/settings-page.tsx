import { SettingsPageLayout } from "@/features/settings/app/components/settings-page-layout";
import { DashboardPage } from "@/shared/components/layout/dashboard-page";
import { getTranslations } from "next-intl/server";

export async function SettingsPage() {
  const t = await getTranslations("settings");

  return (
    <DashboardPage title={t("title")} description={t("description")}>
      <SettingsPageLayout />
    </DashboardPage>
  );
}
