/** Estado de saúde operacional por permanência na etapa (SLA da `PathwayStage`). */
export type SlaHealthStatus = "ok" | "warning" | "danger";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Calcula ok / warning / danger a partir dos dias na etapa e dos limiares da etapa.
 * Ordem: se `days >= alertCriticalDays` → danger; senão se `days >= alertWarningDays` → warning; senão ok.
 * Limiares `null` ou ausentes são ignorados (não disparam aquele nível).
 */
export function computeSlaHealthStatus(
  enteredStageAt: Date,
  now: Date,
  alertWarningDays: number | null | undefined,
  alertCriticalDays: number | null | undefined,
): SlaHealthStatus {
  const days = Math.floor((now.getTime() - enteredStageAt.getTime()) / MS_PER_DAY);

  const crit =
    alertCriticalDays != null && Number.isFinite(alertCriticalDays) && alertCriticalDays >= 0
      ? Math.floor(alertCriticalDays)
      : null;
  const warn =
    alertWarningDays != null && Number.isFinite(alertWarningDays) && alertWarningDays >= 0
      ? Math.floor(alertWarningDays)
      : null;

  if (crit !== null && days >= crit) return "danger";
  if (warn !== null && days >= warn) return "warning";
  return "ok";
}
