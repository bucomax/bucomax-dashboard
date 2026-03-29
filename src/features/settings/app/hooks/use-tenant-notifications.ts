"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import {
  getTenantNotificationSettings,
  updateTenantNotificationSettings,
} from "@/features/settings/app/services/tenant-settings.service";
import type { TenantNotificationSettingsDto } from "@/types/api/tenant-settings-v1";

const DEFAULT_PREFERENCES: TenantNotificationSettingsDto = {
  notifyCriticalAlerts: true,
  notifySurgeryReminders: true,
  notifyNewPatients: true,
  notifyWeeklyReport: true,
  notifyDocumentDelivery: true,
};

export function useTenantNotifications() {
  const t = useTranslations("settings.notifications");
  const { data: session, status: sessionStatus } = useSession();
  const [preferences, setPreferences] = useState<TenantNotificationSettingsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canEdit =
    session?.user?.tenantRole === "tenant_admin" || session?.user?.globalRole === "super_admin";

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getTenantNotificationSettings();
      setPreferences(response.notifications);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setPreferences(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    void reload();
  }, [reload, sessionStatus]);

  const savePreferences = useCallback(async (input: TenantNotificationSettingsDto) => {
    setSaving(true);
    try {
      const response = await updateTenantNotificationSettings(input);
      setPreferences(response.notifications);
      return response.notifications;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    sessionStatus,
    preferences: preferences ?? DEFAULT_PREFERENCES,
    hasLoaded: preferences !== null,
    loading,
    error,
    saving,
    canEdit,
    reload,
    savePreferences,
  };
}
