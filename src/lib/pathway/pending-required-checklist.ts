import type { Prisma } from "@prisma/client";

/**
 * Itens de checklist da etapa atual marcados como obrigatórios para transição
 * e ainda sem `completedAt` no progresso do paciente.
 */
export async function listPendingRequiredChecklistItems(
  tx: Prisma.TransactionClient,
  patientPathwayId: string,
  currentStageId: string,
): Promise<{ id: string; label: string }[]> {
  const required = await tx.pathwayStageChecklistItem.findMany({
    where: { pathwayStageId: currentStageId, requiredForTransition: true },
    select: { id: true, label: true },
    orderBy: { sortOrder: "asc" },
  });
  if (required.length === 0) return [];

  const progress = await tx.patientPathwayChecklistItem.findMany({
    where: {
      patientPathwayId,
      checklistItemId: { in: required.map((r) => r.id) },
    },
    select: { checklistItemId: true, completedAt: true },
  });
  const completedAtByItemId = new Map(progress.map((p) => [p.checklistItemId, p.completedAt]));

  return required.filter((r) => completedAtByItemId.get(r.id) == null);
}
