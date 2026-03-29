"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import {
  createOpmeSupplier,
  listOpmeSuppliers,
} from "@/features/settings/app/services/tenant-settings.service";
import type { ApiPagination } from "@/lib/api/pagination";
import { useDebouncedState } from "@/shared/hooks/use-debounce";
import type { OpmeSupplierDto } from "@/types/api/tenant-settings-v1";

const PAGE_SIZE = 10;

const EMPTY_PAGINATION: ApiPagination = {
  page: 1,
  limit: PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

export function useOpmeSuppliers() {
  const t = useTranslations("settings.opme");
  const { data: session, status: sessionStatus } = useSession();
  const [query, debouncedQuery, setQuery] = useDebouncedState("", { trim: true });
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<OpmeSupplierDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<ApiPagination>(EMPTY_PAGINATION);
  const [creating, setCreating] = useState(false);

  const canCreate =
    session?.user?.tenantRole === "tenant_admin" || session?.user?.globalRole === "super_admin";

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listOpmeSuppliers({
        page,
        limit: PAGE_SIZE,
        q: debouncedQuery || undefined,
        includeInactive: true,
      });
      setRows(response.data);
      setPagination(response.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("listError"));
      setRows([]);
      setPagination(EMPTY_PAGINATION);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, page, t]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const rangeLabel = useMemo(() => {
    if (pagination.totalItems === 0) {
      return t("range", { from: 0, to: 0, total: 0 });
    }
    const from = (pagination.page - 1) * pagination.limit + 1;
    const to = Math.min(from + rows.length - 1, pagination.totalItems);
    return t("range", { from, to, total: pagination.totalItems });
  }, [pagination, rows.length, t]);

  const createSupplier = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setCreating(true);
      try {
        await createOpmeSupplier(trimmed);
        setPage(1);
        await reload();
      } finally {
        setCreating(false);
      }
    },
    [reload],
  );

  return {
    sessionStatus,
    canCreate,
    query,
    setQuery,
    page,
    setPage,
    rows,
    loading,
    error,
    pagination,
    rangeLabel,
    creating,
    reload,
    createSupplier,
  };
}
