"use client";

import { listClientFiles } from "@/features/clients/app/services/clients.service";
import type { ClientFilesListResponseData } from "@/types/api/files-v1";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_LIMIT = 10;

export function useClientFiles(clientId: string) {
  const t = useTranslations("clients.detail.files");
  const [data, setData] = useState<ClientFilesListResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = await listClientFiles(clientId, { page, limit: DEFAULT_LIMIT });
      setData(row);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, page, t]);

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
    page,
    setPage,
    reload,
    limit: DEFAULT_LIMIT,
  };
}
