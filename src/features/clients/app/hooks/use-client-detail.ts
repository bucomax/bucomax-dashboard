"use client";

import { getClientDetail } from "@/features/clients/app/services/clients.service";
import type { ClientDetailResponseData } from "@/types/api/clients-v1";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const TRANSITIONS_LIMIT = 20;

export function useClientDetail(clientId: string) {
  const t = useTranslations("clients.detail");
  const [data, setData] = useState<ClientDetailResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = await getClientDetail(clientId, {
        page: 1,
        limit: TRANSITIONS_LIMIT,
      });
      setData(row);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, t]);

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
    reload,
    transitionsLimit: TRANSITIONS_LIMIT,
  };
}
