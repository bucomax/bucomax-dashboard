import type { SlaHealthStatus } from "@/lib/pathway/sla-health";

/**
 * Classes Tailwind para cartão de paciente no Kanban por `SlaHealthStatus`.
 * O valor de `status` deve ser o mesmo domínio de {@link computeSlaHealthStatus} (`lib/pathway/sla-health`),
 * usado nas rotas `/kanban` e afins.
 */
export function slaHealthKanbanCardClassName(status: SlaHealthStatus): string {
  if (status === "danger") {
    return "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400";
  }
  if (status === "warning") {
    return "border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300";
  }
  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
}

/** Pill compacta (lista/tabela) alinhada a {@link slaHealthKanbanCardClassName}. */
export function slaHealthPillClassName(status: SlaHealthStatus): string {
  if (status === "danger") {
    return "bg-red-500/15 text-red-800 dark:text-red-300";
  }
  if (status === "warning") {
    return "bg-amber-500/15 text-amber-900 dark:text-amber-200";
  }
  return "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200";
}
