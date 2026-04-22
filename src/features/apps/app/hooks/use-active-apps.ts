"use client";

import { useCallback, useEffect, useState } from "react";
import { getActiveApps } from "@/features/apps/app/services/apps.service";
import { ACTIVE_APPS_INVALIDATE_EVENT } from "@/features/apps/app/lib/invalidate-active-apps";
import type { ActiveAppDto } from "@/types/api/apps-v1";

export function useActiveApps() {
  const [apps, setApps] = useState<ActiveAppDto[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getActiveApps();
      setApps(data);
    } catch {
      // silencioso — sidebar não deve quebrar
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onInvalidate = () => {
      void refresh();
    };
    window.addEventListener(ACTIVE_APPS_INVALIDATE_EVENT, onInvalidate);
    return () => window.removeEventListener(ACTIVE_APPS_INVALIDATE_EVENT, onInvalidate);
  }, [refresh]);

  return { apps, loading, refresh };
}
