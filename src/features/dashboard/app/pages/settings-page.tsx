import { UsersManagementPanel } from "@/features/settings/app/components/users-management-panel";
import { DashboardPage } from "@/shared/components/layout/dashboard-page";
import { getTranslations } from "next-intl/server";

export async function SettingsPage() {
  const t = await getTranslations("settings");

  return (
    <DashboardPage title={t("title")} description={t("description")}>
      <UsersManagementPanel />
    </DashboardPage>
  );
}
