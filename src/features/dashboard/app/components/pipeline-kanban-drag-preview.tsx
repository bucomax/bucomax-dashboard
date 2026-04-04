"use client";

import type { KanbanPatientPathway } from "@/features/dashboard/types";
import { slaHealthKanbanCardClassName } from "@/lib/utils/sla-status-ui";
import { cn } from "@/lib/utils";
import { formatPhoneBrDisplay } from "@/lib/validators/phone";
import { Siren } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

function calendarDaysInStage(enteredStageAt: string): number {
  const entered = new Date(enteredStageAt);
  const a = new Date(entered.getFullYear(), entered.getMonth(), entered.getDate());
  const now = new Date();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)));
}

type StageDurationTone = "ok" | "warning" | "critical";

function stageDurationTone(pp: KanbanPatientPathway, days: number): StageDurationTone {
  const warn = pp.currentStage.alertWarningDays;
  const crit = pp.currentStage.alertCriticalDays;
  if (pp.slaStatus === "danger" || (crit != null && days >= crit)) {
    return "critical";
  }
  if (pp.slaStatus === "warning" || (warn != null && days >= warn)) {
    return "warning";
  }
  return "ok";
}

/** Pré-visualização espelhada do card no {@link DragOverlay} (fora do fluxo flex da coluna). */
export function PipelineKanbanDragPreview({ pp }: { pp: KanbanPatientPathway }) {
  const t = useTranslations("dashboard.pipeline");
  const days = useMemo(() => calendarDaysInStage(pp.enteredStageAt), [pp.enteredStageAt]);
  const tone = useMemo(() => stageDurationTone(pp, days), [pp, days]);
  const durationLabel = t("drag.daysInStage", { count: days });

  return (
    <div
      className={cn(
        "w-[min(280px,calc(100vw-2rem))] cursor-grabbing rounded-lg border bg-card text-sm shadow-lg",
        "transform-gpu",
        slaHealthKanbanCardClassName(pp.slaStatus),
      )}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{pp.client.name}</p>
            <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">{formatPhoneBrDisplay(pp.client.phone)}</p>
          </div>
        </div>
        <div
          className={cn(
            "mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
            tone === "ok" && "bg-teal-50 text-teal-900 dark:bg-teal-950/45 dark:text-teal-100",
            tone === "warning" && "bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
            tone === "critical" && "bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100",
          )}
        >
          {tone === "critical" ? (
            <Siren className="size-3.5 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
          ) : null}
          <span className="min-w-0 truncate">{durationLabel}</span>
        </div>
      </div>
    </div>
  );
}
