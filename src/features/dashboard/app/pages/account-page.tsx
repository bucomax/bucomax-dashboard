import { AccountProfileCard } from "@/features/account/app/components/account-profile-card";
import { ChangePasswordCard } from "@/features/account/app/components/change-password-card";
import { DeleteAccountCard } from "@/features/account/app/components/delete-account-card";
import { TenantMembersCard } from "@/features/account/app/components/tenant-members-card";
import { DashboardPage } from "@/shared/components/layout/dashboard-page";
import { getTranslations } from "next-intl/server";

export async function AccountPage() {
  const t = await getTranslations("account");

  return (
    <DashboardPage title={t("title")} description={t("description")}>
      <div className="space-y-6">
        <AccountProfileCard />
        <ChangePasswordCard />
        <TenantMembersCard />
        <DeleteAccountCard />
      </div>
    </DashboardPage>
  );
}
