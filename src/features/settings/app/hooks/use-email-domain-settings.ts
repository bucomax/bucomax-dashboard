"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import {
  deleteEmailDomain,
  getEmailDomainSettings,
  patchEmailDomain,
  postSetupEmailDomain,
  postVerifyEmailDomain,
} from "@/features/settings/app/services/email-domain.service";
import type { TenantEmailDomainDto } from "@/types/api/email-domain-v1";

const EMPTY: TenantEmailDomainDto = {
  outboundMode: "platform",
  emailEnabled: false,
  fromName: null,
  fromAddress: null,
  domainName: null,
  status: "none",
  dnsRecords: null,
  verifiedAt: null,
};

export function useEmailDomainSettings() {
  const t = useTranslations("settings.email");
  const { data: session, status: sessionStatus } = useSession();
  const [data, setData] = useState<TenantEmailDomainDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canEdit =
    session?.user?.tenantRole === "tenant_admin" || session?.user?.globalRole === "super_admin";

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getEmailDomainSettings();
      setData(r.emailDomain);
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

  const setup = useCallback(
    async (input: { domainName: string; fromName: string; localPart: string }) => {
      setBusy(true);
      try {
        const r = await postSetupEmailDomain(input);
        setData(r.emailDomain);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const verify = useCallback(async () => {
    setBusy(true);
    try {
      const r = await postVerifyEmailDomain();
      setData(r.emailDomain);
    } finally {
      setBusy(false);
    }
  }, []);

  const remove = useCallback(async () => {
    setBusy(true);
    try {
      const r = await deleteEmailDomain();
      setData(r.emailDomain);
    } finally {
      setBusy(false);
    }
  }, []);

  const patch = useCallback(
    async (input: {
      emailOutboundMode?: "platform" | "smtp" | "resend_domain";
      emailEnabled?: boolean;
      fromName?: string;
      fromAddress?: string;
    }) => {
    setBusy(true);
    try {
      const r = await patchEmailDomain(input);
      setData(r.emailDomain);
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    sessionStatus,
    emailDomain: data ?? EMPTY,
    hasLoaded: data !== null,
    loading,
    error,
    busy,
    canEdit,
    reload,
    setup,
    verify,
    remove,
    patch,
  };
}
