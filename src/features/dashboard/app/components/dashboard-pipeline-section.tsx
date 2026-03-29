"use client";

import type { DashboardPipelineSectionProps } from "@/features/dashboard/types";
import { useExportDashboardPipeline } from "@/features/dashboard/app/hooks/use-export-dashboard-pipeline";
import { useDashboardPipeline } from "@/features/dashboard/app/hooks/use-dashboard-pipeline";
import { PipelineAlertsCard } from "./pipeline-alerts-card";
import { PipelineChangeStageDialog } from "./pipeline-change-stage-dialog";
import { PipelineEmptyState } from "./pipeline-empty-state";
import { PipelineFiltersBar } from "./pipeline-filters-bar";
import { PipelineKanbanBoard } from "./pipeline-kanban-board";
import { PipelineNewPatientDialog } from "./pipeline-new-patient-dialog";
import { PipelinePathwaySelect } from "./pipeline-pathway-select";
import { PipelineSectionHeader } from "./pipeline-section-header";
import { PipelineStatsGrid } from "./pipeline-stats-grid";
import { useCallback, useState } from "react";

/**
 * Composição da área de pipeline na home: estado e dados vêm de {@link useDashboardPipeline};
 * UI fragmentada em subcomponentes (SRP).
 */
export function DashboardPipelineSection({ pathways }: DashboardPipelineSectionProps) {
  const p = useDashboardPipeline(pathways);
  const { exportCsv, visiblePatientsCount } = useExportDashboardPipeline({
    columns: p.columns,
    pathways: p.withPublished,
    pathwayId: p.pathwayId,
    search: p.search,
    statusFilter: p.statusFilter,
    opmeSupplierId: p.opmeSupplierId,
    opmeOptions: p.opmeOptions,
  });
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [newPatientKey, setNewPatientKey] = useState(0);
  const [changeStageForId, setChangeStageForId] = useState<string | null>(null);

  const openNewPatient = useCallback(() => {
    setNewPatientKey((k) => k + 1);
    setNewPatientOpen(true);
  }, []);

  if (p.withPublished.length === 0) {
    return <PipelineEmptyState />;
  }

  return (
    <section className="mt-8 space-y-6">
      <PipelineSectionHeader
        onOpenNewPatient={openNewPatient}
        onExportCsv={exportCsv}
        exportDisabled={visiblePatientsCount === 0}
      />

      <PipelinePathwaySelect
        pathways={p.withPublished}
        value={p.pathwayId}
        onValueChange={p.setPathwayId}
      />

      <PipelineStatsGrid
        summary={p.summary}
        loading={p.loading}
        statusFilter={p.statusFilter}
        onClearStatus={p.clearStatusFilter}
        onToggleSlaStatus={p.toggleSlaStatusFilter}
      />

      <PipelineAlertsCard alerts={p.alerts} />

      <PipelineFiltersBar
        search={p.search}
        onSearchChange={p.setSearch}
        statusFilter={p.statusFilter}
        onStatusFilterChange={p.setStatusFilter}
        opmeSupplierId={p.opmeSupplierId}
        onOpmeSupplierIdChange={p.setOpmeSupplierId}
        opmeOptions={p.opmeOptions}
        hasActiveFilters={p.hasActiveFilters}
        onClearFilters={p.clearFilters}
      />

      <PipelineKanbanBoard
        columns={p.columns}
        statusFilter={p.statusFilter}
        loadingInitial={p.loadingKanbanInitial}
        loadingMoreStageId={p.loadingMoreStageId}
        transitioningPatientPathwayId={p.transitioningPatientPathwayId}
        onLoadMoreColumn={(stageId) => void p.loadMoreColumn(stageId)}
        onMovePatientToStage={(patientPathwayId, toStageId) =>
          void p.movePatientToStage(patientPathwayId, toStageId)
        }
        onRequestChangeStage={(id) => setChangeStageForId(id)}
      />

      <PipelineNewPatientDialog
        open={newPatientOpen}
        onOpenChange={setNewPatientOpen}
        mountKey={newPatientKey}
        onSuccess={() => void p.refreshPipeline()}
      />

      <PipelineChangeStageDialog
        patientPathwayId={changeStageForId}
        open={changeStageForId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setChangeStageForId(null);
          }
        }}
        onSuccess={() => void p.refreshPipeline()}
      />
    </section>
  );
}
