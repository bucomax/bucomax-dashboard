"use client";

import { useCallback, useEffect, useState } from "react";
import { getAppDetail } from "@/features/apps/app/services/apps.service";
import type { AppDetailResponseData } from "@/types/api/apps-v1";

export function useAppDetail(appId: string | undefined) {
  const [data, setData] = useState<AppDetailResponseData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!appId) return;
    setLoading(true);
    try {
      const result = await getAppDetail(appId);
      setData(result);
    } catch {
      // apiClient já trata toast
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
