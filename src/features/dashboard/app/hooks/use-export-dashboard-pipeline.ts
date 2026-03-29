"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";

import type {
  DashboardPathwayOption,
  DashboardPipelineOpmeOption,
  KanbanColumn,
  PipelineStatusFilter,
} from "@/features/dashboard/types";
import { buildPipelineCsv } from "@/features/dashboard/app/utils/export-pipeline-csv";
import { KANBAN_OPME_QUERY_UNASSIGNED } from "@/lib/pathway/kanban-client-where";

type UseExportDashboardPipelineParams = {
  columns: KanbanColumn[];
  pathways: DashboardPathwayOption[];
  pathwayId: string;
  search: string;
  statusFilter: PipelineStatusFilter;
  opmeSupplierId: string;
  opmeOptions: DashboardPipelineOpmeOption[];
};

export function useExportDashboardPipeline({
  columns,
  pathways,
  pathwayId,
  search,
  statusFilter,
  opmeSupplierId,
  opmeOptions,
}: UseExportDashboardPipelineParams) {
  const t = useTranslations("dashboard.pipeline");

  const selectedPathway = useMemo(
    () => pathways.find((pathway) => pathway.id === pathwayId) ?? null,
    [pathwayId, pathways],
  );

  const opmeFilterLabel = useMemo(() => {
    if (!opmeSupplierId) return "";
    if (opmeSupplierId === KANBAN_OPME_QUERY_UNASSIGNED) return t("filters.opmeUnassigned");
    return opmeOptions.find((o) => o.value === opmeSupplierId)?.label ?? opmeSupplierId;
  }, [opmeOptions, opmeSupplierId, t]);

  const visiblePatientsCount = useMemo(
    () => columns.reduce((sum, column) => sum + column.data.length, 0),
    [columns],
  );

  const exportCsv = useCallback(() => {
    const csv = buildPipelineCsv({
      columns,
      pathwayName: selectedPathway?.name ?? "",
      search,
      statusFilter,
      opmeFilterLabel,
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateSuffix = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `dashboard-pipeline-${dateSuffix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [columns, opmeFilterLabel, search, selectedPathway?.name, statusFilter]);

  return {
    selectedPathway,
    visiblePatientsCount,
    exportCsv,
  };
}
