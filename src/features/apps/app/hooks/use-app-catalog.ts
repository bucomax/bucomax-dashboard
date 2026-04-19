"use client";

import { useCallback, useEffect, useState } from "react";
import { getAppCatalog } from "@/features/apps/app/services/apps.service";
import type { AppCatalogResponseData } from "@/types/api/apps-v1";

export function useAppCatalog(params?: { category?: string; search?: string }) {
  const [data, setData] = useState<AppCatalogResponseData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAppCatalog(params);
      setData(result);
    } catch {
      // apiClient já trata toast
    } finally {
      setLoading(false);
    }
  }, [params?.category, params?.search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
