"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { ReportsBreakdownCard } from "@/features/dashboard/app/components/reports-breakdown-card";
import { ReportsCriticalPatientsCard } from "@/features/dashboard/app/components/reports-critical-patients-card";
import { ReportsFiltersBar } from "@/features/dashboard/app/components/reports-filters-bar";
import { useDashboardReports } from "@/features/dashboard/app/hooks/use-dashboard-reports";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

function ReportsLoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

export function DashboardReportsSection() {
  const t = useTranslations("dashboard.reports");
  const {
    periodDays,
    setPeriodDays,
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
  } = useDashboardReports();

  const statusRows = useMemo(
    () =>
      (data?.byStatus ?? []).map((row) => ({
        id: row.status,
        label: t(`status.${row.status}`),
        count: row.count,
      })),
    [data?.byStatus, t],
  );

  const opmeRows = useMemo(
    () =>
      (data?.byOpme ?? []).map((row) => ({
        ...row,
        label: row.label ?? t("unassignedOpme"),
      })),
    [data?.byOpme, t],
  );

  if (loading && !data && !error) {
    return <ReportsLoadingState />;
  }

  return (
    <div className="space-y-4">
      <ReportsFiltersBar
        periodDays={periodDays}
        onPeriodDaysChange={setPeriodDays}
        pathwayId={pathwayId}
        onPathwayIdChange={setPathwayId}
        opmeSupplierId={opmeSupplierId}
        onOpmeSupplierIdChange={setOpmeSupplierId}
        periodOptions={periodOptions}
        pathwayOptions={pathwayOptions}
        opmeOptions={opmeOptions}
        loading={loading}
        exporting={exporting}
        onReload={() => void reload()}
        onExportCsv={() => void exportCsv()}
      />

      {error ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs">{t("cards.patientsInScope")}</p>
            <p className="mt-2 text-2xl font-semibold">{data?.kpis.patientsInScope ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs">{t("cards.criticalPatients")}</p>
            <p className="mt-2 text-2xl font-semibold">{data?.kpis.criticalPatients ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs">{t("cards.transitionsInPeriod")}</p>
            <p className="mt-2 text-2xl font-semibold">{data?.kpis.transitionsInPeriod ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs">{t("cards.pathwaysInScope")}</p>
            <p className="mt-2 text-2xl font-semibold">{data?.kpis.pathwaysInScope ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportsBreakdownCard
          title={t("charts.byStageTitle")}
          description={t("charts.byStageDescription")}
          rows={(data?.byStage ?? []).map((row) => ({ ...row, label: row.label ?? "-" }))}
          empty={t("empty")}
        />
        <ReportsBreakdownCard
          title={t("charts.byStatusTitle")}
          description={t("charts.byStatusDescription")}
          rows={statusRows}
          empty={t("empty")}
        />
        <ReportsBreakdownCard
          title={t("charts.byPathwayTitle")}
          description={t("charts.byPathwayDescription")}
          rows={(data?.byPathway ?? []).map((row) => ({ ...row, label: row.label ?? "-" }))}
          empty={t("empty")}
        />
        <ReportsBreakdownCard
          title={t("charts.byOpmeTitle")}
          description={t("charts.byOpmeDescription")}
          rows={opmeRows}
          empty={t("empty")}
        />
      </div>

      {data ? (
        <ReportsCriticalPatientsCard
          criticalPatients={data.criticalPatients}
          loading={loading}
          onPageChange={(nextPage) => {
            if (nextPage === page) return;
            setPage(nextPage);
          }}
        />
      ) : null}
    </div>
  );
}
