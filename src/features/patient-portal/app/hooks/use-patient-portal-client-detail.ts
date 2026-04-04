"use client";

import {
  fetchPatientPortalDetail,
  PatientPortalUnauthorizedError,
} from "@/lib/api/patient-portal-client";
import type { PatientPortalDetailResponseData } from "@/types/api/patient-portal-v1";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const TRANSITIONS_LIMIT = 20;

export function usePatientPortalClientDetail(tenantSlug: string) {
  const t = useTranslations("clients.detail");
  const [data, setData] = useState<PatientPortalDetailResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsLink, setNeedsLink] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNeedsLink(false);
    try {
      const row = await fetchPatientPortalDetail(tenantSlug, 1, TRANSITIONS_LIMIT);
      setData(row);
    } catch (e) {
      if (e instanceof PatientPortalUnauthorizedError) {
        setData(null);
        setNeedsLink(true);
        return;
      }
      setError(e instanceof Error ? e.message : t("loadError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const reload = useCallback(() => {
    void load();
  }, [load]);

  return {
    data,
    error,
    loading,
    needsLink,
    reload,
    transitionsLimit: TRANSITIONS_LIMIT,
  };
}
