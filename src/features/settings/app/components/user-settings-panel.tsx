import { AccountProfileCard } from "@/features/settings/app/components/account-profile-card";
import { ChangePasswordCard } from "@/features/settings/app/components/change-password-card";
import { DeleteAccountCard } from "@/features/settings/app/components/delete-account-card";

export function UserSettingsPanel() {
  return (
    <div className="space-y-6">
      <AccountProfileCard />
      <ChangePasswordCard />
      <DeleteAccountCard />
    </div>
  );
}
