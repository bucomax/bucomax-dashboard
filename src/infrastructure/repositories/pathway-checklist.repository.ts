import type { IPathwayChecklistRepository } from "@/application/ports/pathway-checklist-repository.port";
import type { Prisma } from "@prisma/client";

/**
 * Itens de checklist da etapa atual marcados como obrigatórios para transição
 * e ainda sem `completedAt` no progresso do paciente.
 */
export class PathwayChecklistPrismaRepository implements IPathwayChecklistRepository {
  async listPendingRequiredForTransition(
    tx: unknown,
    patientPathwayId: string,
    currentStageId: string,
  ): Promise<{ id: string; label: string }[]> {
    const db = tx as Prisma.TransactionClient;
    const required = await db.pathwayStageChecklistItem.findMany({
      where: { pathwayStageId: currentStageId, requiredForTransition: true },
      select: { id: true, label: true },
      orderBy: { sortOrder: "asc" },
    });
    if (required.length === 0) return [];

    const progress = await db.patientPathwayChecklistItem.findMany({
      where: {
        patientPathwayId,
        checklistItemId: { in: required.map((r) => r.id) },
      },
      select: { checklistItemId: true, completedAt: true },
    });
    const completedAtByItemId = new Map(progress.map((p) => [p.checklistItemId, p.completedAt]));

    return required.filter((r) => completedAtByItemId.get(r.id) == null);
  }
}

export const pathwayChecklistPrismaRepository = new PathwayChecklistPrismaRepository();
