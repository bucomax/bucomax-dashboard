"use client";

import { InviteUserCard } from "@/features/settings/app/components/invite-user-card";
import { TenantMembersCard } from "@/features/settings/app/components/tenant-members-card";
import { Button } from "@/shared/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function UsersManagementPanel() {
  const t = useTranslations("settings");
  const { data: session, status } = useSession();
  const canManage =
    session?.user?.tenantRole === "tenant_admin" || session?.user?.globalRole === "super_admin";
  const [showInvite, setShowInvite] = useState(false);

  if (status === "loading") {
    return null;
  }
  if (!canManage) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setShowInvite((prev) => !prev)}>
          {showInvite ? <Minus className="size-4" /> : <Plus className="size-4" />}
          {showInvite ? t("hideAddUser") : t("addUser")}
        </Button>
      </div>
      {showInvite ? <InviteUserCard /> : null}
      <TenantMembersCard />
    </div>
  );
}
