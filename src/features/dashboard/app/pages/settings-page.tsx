import { InviteUserCard } from "@/features/settings/app/components/invite-user-card";
import { DashboardPage } from "@/shared/components/layout/dashboard-page";
import { getTranslations } from "next-intl/server";

export async function SettingsPage() {
  const t = await getTranslations("settings");

  return (
    <DashboardPage title={t("title")} description={t("description")}>
      <div className="space-y-6">
        <InviteUserCard />
      </div>
    </DashboardPage>
  );
}
