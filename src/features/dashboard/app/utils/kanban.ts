import type { KanbanPatientPathway } from "@/features/dashboard/app/types";

export type StageDurationTone = "ok" | "warning" | "critical";

export function stageDurationTone(pp: KanbanPatientPathway, days: number): StageDurationTone {
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
