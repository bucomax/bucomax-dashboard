"use client";

import { getClientTimeline } from "@/features/clients/app/services/clients.service";
import type { ClientTimelineResponseData } from "@/types/api/clients-v1";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const TIMELINE_LIMIT = 20;

export function useClientTimeline(clientId: string, refreshSignal = 0) {
  const t = useTranslations("clients.detail");
  const [data, setData] = useState<ClientTimelineResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = await getClientTimeline(clientId, { page, limit: TIMELINE_LIMIT });
      setData(row);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("timeline.loadError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, page, t]);

  useEffect(() => {
    void load();
  }, [load, refreshSignal]);

  const reload = useCallback(() => {
    void load();
  }, [load]);

  return {
    data,
    error,
    loading,
    page,
    setPage,
    reload,
    limit: TIMELINE_LIMIT,
  };
}
