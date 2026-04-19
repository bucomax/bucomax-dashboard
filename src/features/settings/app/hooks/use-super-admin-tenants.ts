"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import {
  createAdminTenant,
  listAdminTenants,
  patchAdminTenant,
} from "@/features/settings/app/services/admin-tenants.service";
import { setActiveTenant } from "@/shared/services/tenant.service";
import type { AdminTenantListItemDto, CreateAdminTenantRequestBody } from "@/types/api/admin-tenants-v1";

export function useSuperAdminTenants() {
  const t = useTranslations("settings.tenants");
  const router = useRouter();
  const { data: session, status: sessionStatus, update } = useSession();
  const [tenants, setTenants] = useState<AdminTenantListItemDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingTenantId, setPendingTenantId] = useState<string | null>(null);
  const [pendingPatchTenantId, setPendingPatchTenantId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const isSuperAdmin = session?.user?.globalRole === "super_admin";
  const activeTenantId = session?.user?.tenantId ?? null;

  const reload = useCallback(async () => {
    if (!isSuperAdmin) {
      setLoading(false);
      setTenants([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { tenants: rows } = await listAdminTenants();
      setTenants(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, t]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    void reload();
  }, [reload, sessionStatus]);

  const switchTenant = useCallback(
    async (tenantId: string) => {
      if (tenantId === activeTenantId) return;
      setPendingTenantId(tenantId);
      try {
        await setActiveTenant(tenantId);
        await update();
        router.refresh();
      } finally {
        setPendingTenantId(null);
      }
    },
    [activeTenantId, router, update],
  );

  const setTenantActive = useCallback(
    async (tenantId: string, isActive: boolean) => {
      setPendingPatchTenantId(tenantId);
      try {
        await patchAdminTenant(tenantId, { isActive });
        await reload();
        await update();
        router.refresh();
      } finally {
        setPendingPatchTenantId(null);
      }
    },
    [reload, router, update],
  );

  const createTenant = useCallback(
    async (input: CreateAdminTenantRequestBody) => {
      setCreating(true);
      try {
        const response = await createAdminTenant({
          name: input.name.trim(),
          slug: input.slug.trim(),
          taxId: input.taxId,
          phone: input.phone,
          addressLine: input.addressLine,
          city: input.city,
          postalCode: input.postalCode,
          admin: input.admin,
        });
        await reload();
        await switchTenant(response.tenant.id);
        return response;
      } finally {
        setCreating(false);
      }
    },
    [reload, switchTenant],
  );

  const sortedTenants = useMemo(
    () => [...(tenants ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [tenants],
  );

  return {
    sessionStatus,
    isSuperAdmin,
    activeTenantId,
    tenants: sortedTenants,
    loading,
    error,
    pendingTenantId,
    pendingPatchTenantId,
    creating,
    reload,
    switchTenant,
    setTenantActive,
    createTenant,
  };
}
