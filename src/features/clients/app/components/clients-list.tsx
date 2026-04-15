"use client";

import { ClientListDeleteDialog } from "@/features/clients/app/components/client-list-delete-dialog";
import { useClientsList } from "@/features/clients/app/hooks/use-clients-list";
import { useCopyPortalLink } from "@/features/clients/app/hooks/use-copy-portal-link";
import { Link } from "@/i18n/navigation";
import type { SlaHealthStatus } from "@/lib/pathway/sla-health";
import { formatListUpdatedAt } from "@/lib/utils/format-list-updated-at";
import { formatCpfDisplay } from "@/lib/validators/cpf";
import { cn } from "@/lib/utils";
import { LabeledSelect } from "@/shared/components/forms/labeled-select";
import {
  DataTableBody,
  DataTableEmpty,
  DataTableFilters,
  DataTableHeader,
  DataTablePagination,
  DataTableRoot,
  DataTableRow,
  DataTableScroll,
} from "@/shared/components/layout/data-table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { GitBranch, Link2, Pencil, RefreshCw, Siren, Trash2, UserRound } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

const GRID_COLS =
  "grid min-w-[760px] grid-cols-[minmax(9rem,1.35fr)_minmax(8rem,0.95fr)_minmax(9rem,1.15fr)_minmax(7.5rem,1fr)_minmax(8rem,1.2fr)_minmax(6.5rem,0.68fr)_minmax(7rem,0.85fr)] gap-2";

/** Mesmo chip de tempo + tom de SLA do cartão do Kanban (`pipeline-kanban-patient-card`). */
function ListStageDaysSlaChip({
  pathwayId,
  patientPathwayId,
  daysInStage,
  slaStatus,
  journeyCompletedAt,
}: {
  pathwayId: string | null;
  patientPathwayId: string | null;
  daysInStage: number | null;
  slaStatus: SlaHealthStatus | null;
  journeyCompletedAt: string | null;
}) {
  const t = useTranslations("clients.list");
  const tPipeline = useTranslations("dashboard.pipeline");
  const onPathway = Boolean(pathwayId ?? patientPathwayId);
  if (!onPathway) {
    return <span className="text-muted-foreground">—</span>;
  }
  if (journeyCompletedAt) {
    return (
      <span className="text-muted-foreground inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium">
        {t("journeyCompletedShort")}
      </span>
    );
  }
  const count = daysInStage ?? 0;
  const durationLabel = tPipeline("drag.daysInStage", { count });
  const tone =
    slaStatus === "danger" ? "critical" : slaStatus === "warning" ? "warning" : "ok";
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        tone === "ok" &&
          "bg-teal-50 text-teal-900 dark:bg-teal-950/45 dark:text-teal-100",
        tone === "warning" &&
          "bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
        tone === "critical" &&
          "bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100",
      )}
    >
      {tone === "critical" ? (
        <Siren className="size-3.5 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
      ) : null}
      <span className="min-w-0 truncate">{durationLabel}</span>
    </div>
  );
}

export function ClientsList() {
  const t = useTranslations("clients.list");
  const locale = useLocale();
  const { data: session } = useSession();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const { copyPortalLink, busyClientId } = useCopyPortalLink();

  const canDeletePatient =
    session?.user?.tenantRole === "tenant_admin" || session?.user?.globalRole === "super_admin";

  const {
    rows,
    total,
    page,
    from,
    to,
    canPrev,
    canNext,
    statusFilterCapped,
    listError,
    pathways,
    pathwaysError,
    stages,
    stagesError,
    stagesLoading,
    search,
    setSearch,
    pathwayFilter,
    setPathwayFilter,
    stageFilter,
    setStageFilter,
    statusFilter,
    setStatusFilter,
    retry,
    reloadList,
    goPrev,
    goNext,
    loading,
    hasActiveSearch,
  } = useClientsList();

  const pathwayOptions = useMemo(() => {
    const base = [{ value: "all", label: t("filters.allPathways") }];
    if (!pathways?.length) return base;
    return [...base, ...pathways.map((p) => ({ value: p.id, label: p.name }))];
  }, [pathways, t]);

  const stageOptions = useMemo(() => {
    if (pathwayFilter === "all") {
      return [{ value: "all", label: t("filters.stageSelectPathwayFirst") }];
    }
    const base = [{ value: "all", label: t("filters.allStages") }];
    if (!stages?.length) return base;
    return [...base, ...stages.map((s) => ({ value: s.id, label: s.name }))];
  }, [pathwayFilter, stages, t]);

  const statusOptions = useMemo(
    () => [
      { value: "all", label: t("filters.allStatus") },
      { value: "ok", label: t("sla.ok") },
      { value: "warning", label: t("sla.warning") },
      { value: "danger", label: t("sla.danger") },
      { value: "completed", label: t("sla.completed") },
    ],
    [t],
  );

  if (loading && rows === null) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (listError) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-destructive text-sm">{listError}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void retry()}>
          <RefreshCw className="size-4 shrink-0" aria-hidden />
          {t("retry")}
        </Button>
      </div>
    );
  }

  const safeRows = rows ?? [];

  return (
    <div className="space-y-4">
      <ClientListDeleteDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        clientId={pendingDelete?.id ?? null}
        clientName={pendingDelete?.name ?? ""}
        onDeleted={() => reloadList()}
      />
      {pathwaysError ? <p className="text-destructive text-sm">{pathwaysError}</p> : null}
      {stagesError ? <p className="text-destructive text-sm">{stagesError}</p> : null}

      {/* ── Filtros ── */}
      <DataTableFilters className="w-full">
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field className="min-w-0">
            <FieldLabel htmlFor="clients-search">{t("search")}</FieldLabel>
            <Input
              id="clients-search"
              className="w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              type="search"
              autoComplete="off"
            />
          </Field>
          <LabeledSelect
            className="min-w-0"
            id="clients-filter-pathway"
            label={t("filters.pathway")}
            value={pathwayFilter}
            onValueChange={setPathwayFilter}
            options={pathwayOptions}
            disabled={pathways === null}
            placeholder={t("filters.pathwayPlaceholder")}
          />
          <LabeledSelect
            className="min-w-0"
            id="clients-filter-stage"
            label={t("filters.stage")}
            value={stageFilter}
            onValueChange={setStageFilter}
            options={stageOptions}
            disabled={pathwayFilter === "all" || stagesLoading}
            placeholder={
              pathwayFilter === "all"
                ? t("filters.stageSelectPathwayFirst")
                : t("filters.stagePlaceholder")
            }
          />
          <LabeledSelect
            className="min-w-0"
            id="clients-filter-status"
            label={t("filters.status")}
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={statusOptions}
          />
        </div>
      </DataTableFilters>

      {statusFilterCapped ? (
        <p className="text-muted-foreground text-xs">{t("pagination.statusCappedHint")}</p>
      ) : null}

      {/* ── Tabela ── */}
      <DataTableRoot>
        <DataTableScroll>
          <DataTableHeader className={GRID_COLS}>
            <span>{t("columns.name")}</span>
            <span>{t("columns.cpf")}</span>
            <span>{t("columns.pathway")}</span>
            <span>{t("columns.stage")}</span>
            <span>{t("columns.daysAndSla")}</span>
            <span className="min-w-0 whitespace-nowrap">{t("columns.updated")}</span>
            <span className="text-end">{t("columns.actions")}</span>
          </DataTableHeader>

          {!safeRows.length ? (
            <DataTableEmpty>
              {hasActiveSearch || pathwayFilter !== "all" || stageFilter !== "all" || statusFilter !== "all"
                ? t("noResults")
                : t("empty")}
            </DataTableEmpty>
          ) : (
            <DataTableBody>
              {safeRows.map((c) => {
                const updatedAtLabel = formatListUpdatedAt(c.updatedAt, locale);
                return (
                <DataTableRow key={c.id} className={GRID_COLS}>
                  <span className="font-medium">
                    <Button
                      nativeButton={false}
                      size="sm"
                      variant="link"
                      className="h-auto min-w-0 max-w-full gap-1.5 px-0 font-medium"
                      render={<Link href={`/dashboard/clients/${c.id}`} />}
                    >
                      <UserRound className="size-3.5 shrink-0" aria-hidden />
                      <span className="min-w-0 truncate">{c.name}</span>
                      {c.isMinor ? (
                        <Badge
                          variant="secondary"
                          className="h-5 shrink-0 px-1.5 text-[10px] font-semibold uppercase tracking-wide"
                        >
                          {t("minorBadge")}
                        </Badge>
                      ) : null}
                    </Button>
                  </span>
                  <span className="text-muted-foreground min-w-0 truncate tabular-nums">
                    {c.documentId ? formatCpfDisplay(c.documentId) : "—"}
                  </span>
                  <span className="min-w-0 truncate">
                    {c.patientPathwayId && c.pathwayName ? (
                      <Button
                        nativeButton={false}
                        size="sm"
                        variant="link"
                        className="h-auto min-w-0 max-w-full gap-1 px-0"
                        render={<Link href={`/dashboard/patient-pathways/${c.patientPathwayId}`} />}
                      >
                        <GitBranch className="size-3.5 shrink-0" aria-hidden />
                        <span className="min-w-0 truncate">{c.pathwayName}</span>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                  <span className="text-muted-foreground min-w-0 truncate">
                    {c.journeyCompletedAt ? "—" : (c.currentStageName ?? "—")}
                  </span>
                  <span className="min-w-0">
                    <ListStageDaysSlaChip
                      pathwayId={c.pathwayId}
                      patientPathwayId={c.patientPathwayId}
                      daysInStage={c.daysInStage}
                      slaStatus={c.slaStatus}
                      journeyCompletedAt={c.journeyCompletedAt ?? null}
                    />
                  </span>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="text-muted-foreground inline-flex min-w-0 max-w-full cursor-default justify-end text-xs tabular-nums outline-none">
                          <span className="min-w-0 truncate">{updatedAtLabel}</span>
                        </span>
                      }
                    />
                    <TooltipContent side="top" align="end" className="max-w-sm text-left">
                      {t("updatedTooltip", { at: updatedAtLabel })}
                    </TooltipContent>
                  </Tooltip>
                  <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="inline-flex">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="outline"
                              aria-label={t("actions.portalLinkAria")}
                              disabled={busyClientId !== null}
                              onClick={() => void copyPortalLink(c.id)}
                            >
                              {busyClientId === c.id ? (
                                <RefreshCw className="size-4 animate-spin" aria-hidden />
                              ) : (
                                <Link2 className="size-4" aria-hidden />
                              )}
                            </Button>
                          </span>
                        }
                      />
                      <TooltipContent side="top">{t("actions.portalLink")}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="inline-flex">
                            <Button
                              nativeButton={false}
                              size="icon-sm"
                              variant="outline"
                              aria-label={t("actions.editAria")}
                              render={<Link href={`/dashboard/clients/${c.id}`} />}
                            >
                              <Pencil className="size-4" aria-hidden />
                            </Button>
                          </span>
                        }
                      />
                      <TooltipContent side="top">{t("actions.edit")}</TooltipContent>
                    </Tooltip>
                    {canDeletePatient ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <span className="inline-flex">
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="outline"
                                className="border-destructive/45 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive dark:border-destructive/55"
                                aria-label={t("actions.deleteAria")}
                                onClick={() => setPendingDelete({ id: c.id, name: c.name })}
                              >
                                <Trash2 className="size-4" aria-hidden />
                              </Button>
                            </span>
                          }
                        />
                        <TooltipContent side="top">{t("actions.delete")}</TooltipContent>
                      </Tooltip>
                    ) : null}
                  </span>
                </DataTableRow>
                );
              })}
            </DataTableBody>
          )}
        </DataTableScroll>

        <DataTablePagination
          page={page}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={goPrev}
          onNext={goNext}
          prevLabel={t("pagination.prev")}
          nextLabel={t("pagination.next")}
          rangeLabel={total === 0 ? t("pagination.emptyRange") : t("pagination.range", { from, to, total })}
        />
      </DataTableRoot>
    </div>
  );
}
