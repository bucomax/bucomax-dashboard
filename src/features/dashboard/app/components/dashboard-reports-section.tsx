"use client";

import { useMemo } from "react";
import { ArrowRightLeft, GitBranch, Siren, Users, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
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
          <Skeleton key={index} className="h-[5.25rem] w-full rounded-xl sm:h-[5.5rem]" />
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
        {(
          [
            [
              "cards.patientsInScope",
              data?.kpis.patientsInScope ?? 0,
              Users,
              "bg-primary/10 text-primary",
            ],
            [
              "cards.criticalPatients",
              data?.kpis.criticalPatients ?? 0,
              Siren,
              "bg-amber-500/15 text-amber-600 dark:text-amber-400",
            ],
            [
              "cards.transitionsInPeriod",
              data?.kpis.transitionsInPeriod ?? 0,
              ArrowRightLeft,
              "bg-sky-500/15 text-sky-600 dark:text-sky-400",
            ],
            [
              "cards.pathwaysInScope",
              data?.kpis.pathwaysInScope ?? 0,
              GitBranch,
              "bg-violet-500/15 text-violet-600 dark:text-violet-400",
            ],
          ] as const satisfies ReadonlyArray<
            readonly [Parameters<typeof t>[0], number, LucideIcon, string]
          >
        ).map(([labelKey, value, Icon, iconTint]) => (
          <Card key={labelKey} className="py-0 gap-0">
            <CardContent className="bg-muted/15 py-3.5 sm:py-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    iconTint,
                  )}
                  aria-hidden
                >
                  <Icon className="size-4" strokeWidth={2} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <p className="text-muted-foreground text-xs font-medium leading-snug">{t(labelKey)}</p>
                  <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
