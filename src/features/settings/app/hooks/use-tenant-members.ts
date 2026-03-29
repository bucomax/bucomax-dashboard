"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import {
  listTenantMembers,
  patchMemberRole,
  removeTenantMember,
} from "@/features/settings/app/services/members.service";
import type { TenantMemberRow, TenantRole } from "@/features/settings/types/account";

export function useTenantMembers() {
  const t = useTranslations("settings.members");
  const { data: session, status } = useSession();
  const tenantId = session?.user?.tenantId ?? null;
  const tenantRole = session?.user?.tenantRole ?? null;
  const globalRole = session?.user?.globalRole ?? null;
  const currentUserId = session?.user?.id ?? null;
  const canManage = Boolean(
    tenantId && (tenantRole === "tenant_admin" || globalRole === "super_admin"),
  );

  const [rows, setRows] = useState<TenantMemberRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tenantId || !canManage) return;
    setError(null);
    try {
      const list = await listTenantMembers(tenantId);
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setRows([]);
    }
  }, [canManage, t, tenantId]);

  useEffect(() => {
    if (status !== "authenticated" || !canManage || !tenantId) {
      return;
    }
    void reload();
  }, [status, canManage, tenantId, reload]);

  const sortedRows = useMemo(() => {
    if (!rows) return [];
    return [...rows].sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
  }, [rows]);

  const updateMemberRole = useCallback(
    async (member: TenantMemberRow, role: TenantRole) => {
      if (!tenantId || member.role === role) return;
      setBusyId(member.userId);
      try {
        await patchMemberRole(tenantId, member.userId, role);
        setRows((prev) =>
          (prev ?? []).map((row) =>
            row.userId === member.userId ? { ...row, role } : row,
          ),
        );
      } finally {
        setBusyId(null);
      }
    },
    [tenantId],
  );

  const deleteMember = useCallback(
    async (member: TenantMemberRow) => {
      if (!tenantId) return;
      setBusyId(member.userId);
      try {
        await removeTenantMember(tenantId, member.userId);
        setRows((prev) => (prev ?? []).filter((row) => row.userId !== member.userId));
      } finally {
        setBusyId(null);
      }
    },
    [tenantId],
  );

  return {
    sessionStatus: status,
    currentUserId,
    tenantId,
    canManage,
    rows,
    sortedRows,
    error,
    busyId,
    reload,
    updateMemberRole,
    deleteMember,
  };
}
