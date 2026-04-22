import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import {
  getTenantSmtpSettings,
  patchTenantSmtpSettings,
  postTestTenantSmtp,
} from "@/features/settings/app/services/tenant-smtp.service";
import type { TenantSmtpDto } from "@/types/api/tenant-smtp-v1";

const EMPTY: TenantSmtpDto = {
  smtpEnabled: false,
  smtpHost: null,
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: null,
  hasPassword: false,
  smtpFromName: null,
  smtpFromAddress: null,
};

export function useTenantSmtp() {
  const t = useTranslations("settings.email");
  const { data: session, status: sessionStatus } = useSession();
  const [data, setData] = useState<TenantSmtpDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canEdit =
    session?.user?.tenantRole === "tenant_admin" || session?.user?.globalRole === "super_admin";

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getTenantSmtpSettings();
      setData(r.smtp);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    void reload();
  }, [reload, sessionStatus]);

  const save = useCallback(
    async (body: Parameters<typeof patchTenantSmtpSettings>[0]) => {
      setBusy(true);
      try {
        const r = await patchTenantSmtpSettings(body);
        setData(r.smtp);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const test = useCallback(async (toOverride?: string) => {
    setBusy(true);
    try {
      await postTestTenantSmtp(toOverride ? { to: toOverride } : {});
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    sessionStatus,
    smtp: data ?? EMPTY,
    hasLoaded: data !== null,
    loading,
    error,
    busy,
    canEdit,
    reload,
    save,
    test,
  };
}
