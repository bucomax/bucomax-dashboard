"use client";

import { TenantMembersCard } from "@/features/account/app/components/tenant-members-card";
import { InviteUserCard } from "@/features/settings/app/components/invite-user-card";
import { Button } from "@/shared/components/ui/button";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function UsersManagementPanel() {
  const t = useTranslations("settings");
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setShowInvite((prev) => !prev)}>
          <Plus className="size-4" />
          {showInvite ? t("hideAddUser") : t("addUser")}
        </Button>
      </div>
      {showInvite ? <InviteUserCard /> : null}
      <TenantMembersCard />
    </div>
  );
}
