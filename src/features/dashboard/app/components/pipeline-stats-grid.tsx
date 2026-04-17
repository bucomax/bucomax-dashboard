"use client";

import type { SlaHealthStatus } from "@/lib/pathway/sla-health";
import type { DashboardSummaryTotals, PipelineStatusFilter } from "@/features/dashboard/app/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, Siren, Users } from "lucide-react";
import { useTranslations } from "next-intl";

type PipelineStatsGridProps = {
  summary: DashboardSummaryTotals | null;
  loading: boolean;
  statusFilter: PipelineStatusFilter;
  onClearStatus: () => void;
  onToggleSlaStatus: (status: SlaHealthStatus) => void;
};

export function PipelineStatsGrid({
  summary,
  loading,
  statusFilter,
  onClearStatus,
  onToggleSlaStatus,
}: PipelineStatsGridProps) {
  const t = useTranslations("dashboard.pipeline");

  if (summary) {
    /**
     * Mesmo padrão entre os quatro: `border-l-4` + tint no fundo (como emerald/amber/red).
     * O “total” usa slate claro na faixa — `zinc-500` ficava escuro demais e parecia barra grossa/fora do padrão.
     * Seleção: anel fino — `ring-2` no 1º card (sempre ativo no filtro padrão) competia com a faixa.
     */
    const interactive =
      "text-left transition-[background-color,box-shadow,filter] duration-200 hover:brightness-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:hover:brightness-[1.03]";
    const selected = "ring-1 ring-inset ring-primary/35";

    const frame =
      "rounded-xl border-t border-r border-b border-border border-l-4 p-5 text-card-foreground shadow-sm";

    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={onClearStatus}
          className={cn(
            interactive,
            frame,
            "border-l-slate-400 bg-slate-50/60 dark:bg-slate-950/25",
            statusFilter === "" && selected,
          )}
        >
          <div className="flex items-center gap-2">
            <Users className="size-4 text-slate-400" aria-hidden />
            <p className="text-muted-foreground text-xs">{t("stats.total")}</p>
          </div>
          <p className="mt-2 text-2xl font-semibold">{summary.total}</p>
        </button>
        <button
          type="button"
          onClick={() => onToggleSlaStatus("ok")}
          className={cn(
            interactive,
            frame,
            "border-l-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/25",
            statusFilter === "ok" && selected,
          )}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
            <p className="text-muted-foreground text-xs">{t("stats.ok")}</p>
          </div>
          <p className="mt-2 text-2xl font-semibold">{summary.ok}</p>
        </button>
        <button
          type="button"
          onClick={() => onToggleSlaStatus("warning")}
          className={cn(
            interactive,
            frame,
            "border-l-amber-500 bg-amber-50/70 dark:bg-amber-950/30",
            statusFilter === "warning" && selected,
          )}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" aria-hidden />
            <p className="text-muted-foreground text-xs">{t("stats.warning")}</p>
          </div>
          <p className="mt-2 text-2xl font-semibold">{summary.warning}</p>
        </button>
        <button
          type="button"
          onClick={() => onToggleSlaStatus("danger")}
          className={cn(
            interactive,
            frame,
            "border-l-red-500 bg-red-50/60 dark:bg-red-950/25",
            statusFilter === "danger" && selected,
          )}
        >
          <div className="flex items-center gap-2">
            <Siren className="size-4 text-red-500" aria-hidden />
            <p className="text-muted-foreground text-xs">{t("stats.danger")}</p>
          </div>
          <p className="mt-2 text-2xl font-semibold">{summary.danger}</p>
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[5.75rem] rounded-xl" />
        ))}
      </div>
    );
  }

  return null;
}
