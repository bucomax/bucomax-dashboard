"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { listPathwaysForTenant } from "@/features/clients/app/services/clients.service";
import type { PathwayOption } from "@/features/clients/types/api";

type UseClientPathwayOptionsParams = {
  enabled: boolean;
  fallbackErrorMessage: string;
};

export function useClientPathwayOptions({
  enabled,
  fallbackErrorMessage,
}: UseClientPathwayOptionsParams) {
  const [pathways, setPathways] = useState<PathwayOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listPathwaysForTenant();
      setPathways(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : fallbackErrorMessage);
      setPathways([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, fallbackErrorMessage]);

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [enabled, reload]);

  const eligiblePathways = useMemo(
    () => (pathways ?? []).filter((pathway) => pathway.publishedVersion != null),
    [pathways],
  );

  return {
    pathways,
    eligiblePathways,
    loading,
    error,
    reload,
  };
}
