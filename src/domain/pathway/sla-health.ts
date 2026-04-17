export type SlaHealthStatus = "ok" | "warning" | "danger";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeSlaHealthStatus(
  enteredStageAt: Date,
  now: Date,
  alertWarningDays: number | null | undefined,
  alertCriticalDays: number | null | undefined,
): SlaHealthStatus {
  const days = Math.floor((now.getTime() - enteredStageAt.getTime()) / MS_PER_DAY);

  const critical =
    alertCriticalDays != null && Number.isFinite(alertCriticalDays) && alertCriticalDays >= 0
      ? Math.floor(alertCriticalDays)
      : null;
  const warning =
    alertWarningDays != null && Number.isFinite(alertWarningDays) && alertWarningDays >= 0
      ? Math.floor(alertWarningDays)
      : null;

  if (critical !== null && days >= critical) return "danger";
  if (warning !== null && days >= warning) return "warning";
  return "ok";
}
