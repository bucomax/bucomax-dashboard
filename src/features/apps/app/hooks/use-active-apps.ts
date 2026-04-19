"use client";

import { useCallback, useEffect, useState } from "react";
import { getActiveApps } from "@/features/apps/app/services/apps.service";
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

  return { apps, loading, refresh };
}
