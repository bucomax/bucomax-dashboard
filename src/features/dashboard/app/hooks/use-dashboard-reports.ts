"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { getReportsSummary } from "@/features/dashboard/app/services/reports.service";
import { buildReportsCsv } from "@/features/dashboard/app/utils/export-reports-csv";
import type { DashboardReportFilterOption } from "@/features/dashboard/app/types";
import type { ReportsSummaryResponseData } from "@/features/dashboard/app/types/api";
import { listPathways } from "@/features/pathways/app/services/pathways.service";
import {
  listOpmeSuppliers,
} from "@/features/settings/app/services/tenant-settings.service";

const DEFAULT_PERIOD_DAYS = 30;
const DEFAULT_LIMIT = 10;

export function useDashboardReports() {
  const t = useTranslations("dashboard.reports");
  const [periodDays, setPeriodDays] = useState(DEFAULT_PERIOD_DAYS);
  const [pathwayId, setPathwayId] = useState("");
  const [opmeSupplierId, setOpmeSupplierId] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReportsSummaryResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pathwayOptions, setPathwayOptions] = useState<DashboardReportFilterOption[]>([]);
  const [opmeOptions, setOpmeOptions] = useState<DashboardReportFilterOption[]>([]);

  const loadOptions = useCallback(async () => {
    try {
      const [pathways, suppliers] = await Promise.all([
        listPathways(),
        listOpmeSuppliers({ limit: 100, includeInactive: true }),
      ]);
      setPathwayOptions(pathways.map((pathway) => ({ value: pathway.id, label: pathway.name })));
      setOpmeOptions(suppliers.data.map((supplier) => ({ value: supplier.id, label: supplier.name })));
    } catch {
      // Os filtros continuam funcionais sem listas; o erro principal aparece no carregamento do relatório.
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getReportsSummary({
        periodDays,
        pathwayId: pathwayId || undefined,
        opmeSupplierId: opmeSupplierId || undefined,
        page,
        limit: DEFAULT_LIMIT,
      });
      setData(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [opmeSupplierId, page, pathwayId, periodDays, t]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    setPage(1);
  }, [periodDays, pathwayId, opmeSupplierId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const exportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const exportLimit = data?.criticalPatients.pagination.totalItems
        ? Math.min(data.criticalPatients.pagination.totalItems, 1000)
        : DEFAULT_LIMIT;
      const exportData = await getReportsSummary({
        periodDays,
        pathwayId: pathwayId || undefined,
        opmeSupplierId: opmeSupplierId || undefined,
        page: 1,
        limit: exportLimit,
      });
      const csv = buildReportsCsv(exportData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateSuffix = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.download = `dashboard-reports-${dateSuffix}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [data?.criticalPatients.pagination.totalItems, opmeSupplierId, pathwayId, periodDays]);

  const periodOptions = useMemo<DashboardReportFilterOption[]>(
    () => [
      { value: "7", label: t("filters.period7") },
      { value: "30", label: t("filters.period30") },
      { value: "90", label: t("filters.period90") },
      { value: "365", label: t("filters.period365") },
    ],
    [t],
  );

  return {
    periodDays,
    setPeriodDays: (value: string) => setPeriodDays(Number(value)),
    pathwayId,
    setPathwayId,
    opmeSupplierId,
    setOpmeSupplierId,
    page,
    setPage,
    data,
    loading,
    error,
    exporting,
    reload,
    exportCsv,
    pathwayOptions,
    opmeOptions,
    periodOptions,
  };
}
