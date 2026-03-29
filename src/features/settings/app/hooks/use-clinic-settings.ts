"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import {
  getTenantClinicSettings,
  updateTenantClinicSettings,
} from "@/features/settings/app/services/tenant-settings.service";
import type { TenantClinicSettingsDto } from "@/types/api/tenant-settings-v1";

export function useClinicSettings() {
  const t = useTranslations("settings.clinic");
  const { data: session, status: sessionStatus } = useSession();
  const [tenant, setTenant] = useState<TenantClinicSettingsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canEdit =
    session?.user?.tenantRole === "tenant_admin" || session?.user?.globalRole === "super_admin";

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getTenantClinicSettings();
      setTenant(response.tenant);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    void reload();
  }, [reload, sessionStatus]);

  const saveClinicSettings = useCallback(
    async (input: {
      name: string;
      taxId: string;
      phone: string;
      addressLine: string;
      city: string;
      postalCode: string;
      affiliatedHospitals: string;
    }) => {
      setSaving(true);
      try {
        const response = await updateTenantClinicSettings({
          name: input.name.trim(),
          taxId: input.taxId.trim() || null,
          phone: input.phone.trim() || null,
          addressLine: input.addressLine.trim() || null,
          city: input.city.trim() || null,
          postalCode: input.postalCode.trim() || null,
          affiliatedHospitals: input.affiliatedHospitals.trim() || null,
        });
        setTenant(response.tenant);
        return response.tenant;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return {
    sessionStatus,
    tenant,
    loading,
    error,
    saving,
    canEdit,
    reload,
    saveClinicSettings,
  };
}
