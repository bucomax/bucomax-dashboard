"use client";

import type { PipelineStatusFilter } from "@/features/dashboard/app/types";
import { usePathname } from "@/i18n/navigation";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

const SEARCH_KEY = "search";
const STATUS_KEY = "status";
const OPME_KEY = "opme";
const PATHWAY_KEY = "pathway";

type PipelineUrlFilters = {
  search: string;
  status: PipelineStatusFilter;
  opmeSupplierId: string;
  pathwayId: string;
};

export function usePipelineUrlFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const replacing = useRef(false);

  const fromUrl: PipelineUrlFilters = {
    search: searchParams.get(SEARCH_KEY) ?? "",
    status: (searchParams.get(STATUS_KEY) as PipelineStatusFilter) || "",
    opmeSupplierId: searchParams.get(OPME_KEY) ?? "",
    pathwayId: searchParams.get(PATHWAY_KEY) ?? "",
  };

  const pushFilters = useCallback(
    (filters: Partial<PipelineUrlFilters>) => {
      if (replacing.current) return;
      replacing.current = true;

      const params = new URLSearchParams(searchParams.toString());

      const apply = (key: string, value: string | undefined) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      };

      if (filters.search !== undefined) apply(SEARCH_KEY, filters.search.trim());
      if (filters.status !== undefined) apply(STATUS_KEY, filters.status);
      if (filters.opmeSupplierId !== undefined) apply(OPME_KEY, filters.opmeSupplierId);
      if (filters.pathwayId !== undefined) apply(PATHWAY_KEY, filters.pathwayId);

      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;

      router.replace(url, { scroll: false });

      requestAnimationFrame(() => {
        replacing.current = false;
      });
    },
    [pathname, router, searchParams],
  );

  return { fromUrl, pushFilters } as const;
}
