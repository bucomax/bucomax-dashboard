"use client";

import { listPathways } from "@/features/pathways/app/services/pathways.service";
import type { PathwayListItem } from "@/features/pathways/types/pathways";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

export function usePathways() {
  const t = useTranslations("pathways.list");
  const [pathways, setPathways] = useState<PathwayListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPathways();
      setPathways(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setPathways([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    pathways,
    loading,
    error,
    reload,
  };
}
