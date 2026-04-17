"use client";

import { useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";

import { sendAdminInvite } from "@/features/settings/app/services/admin-invites.service";
import type { AdminInviteResult, TenantRole } from "@/features/settings/app/types/account";

export function useAdminInvite() {
  const { data: session, status } = useSession();
  const tenantId = session?.user?.tenantId ?? null;
  const tenantRole = session?.user?.tenantRole ?? null;
  const globalRole = session?.user?.globalRole ?? null;

  const canInvite = useMemo(
    () =>
      Boolean(
        tenantId && (tenantRole === "tenant_admin" || globalRole === "super_admin"),
      ),
    [globalRole, tenantId, tenantRole],
  );

  const submitInvite = useCallback(
    async (input: { email: string; name?: string; role: TenantRole }): Promise<AdminInviteResult> => {
      if (!tenantId) {
        throw new Error("Tenant ativo não encontrado.");
      }
      return sendAdminInvite({
        ...input,
        tenantId,
      });
    },
    [tenantId],
  );

  return {
    sessionStatus: status,
    tenantId,
    canInvite,
    submitInvite,
  };
}
