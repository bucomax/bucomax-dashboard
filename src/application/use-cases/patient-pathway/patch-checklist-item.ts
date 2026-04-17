import { AuditEventType } from "@prisma/client";
import { notificationEmitter } from "@/infrastructure/notifications/notification-emitter";
import { auditEventPrismaRepository } from "@/infrastructure/repositories/audit-event.repository";
import { patientPathwayPrismaRepository } from "@/infrastructure/repositories/patient-pathway.repository";
import { resolvePathwayNotificationTargetUserIds } from "@/application/use-cases/notification/resolve-notification-targets";
import { patchPatientChecklistItemBodySchema } from "@/lib/validators/patient-pathway-checklist";
import type { z } from "zod";

export type PatchPatientChecklistBody = z.infer<typeof patchPatientChecklistItemBodySchema>;

export type PatchChecklistItemResult =
  | {
      ok: true;
      item: {
        checklistItemId: string;
        completed: boolean;
        completedAt: string | null;
      };
    }
  | { ok: false; code: "PP_NOT_FOUND" | "ITEM_NOT_FOUND" | "WRONG_STAGE" };

export async function runPatchPatientChecklistItem(params: {
  tenantId: string;
  actorUserId: string;
  patientPathwayId: string;
  itemId: string;
  body: PatchPatientChecklistBody;
}): Promise<PatchChecklistItemResult> {
  const { tenantId, actorUserId, patientPathwayId, itemId, body: parsed } = params;

  const patientPathwayRow = await patientPathwayPrismaRepository.findSummaryForChecklist(
    tenantId,
    patientPathwayId,
  );
  if (!patientPathwayRow || typeof patientPathwayRow !== "object") {
    return { ok: false, code: "PP_NOT_FOUND" };
  }
  const patientPathway = patientPathwayRow as {
    id: string;
    clientId: string;
    currentStageId: string;
    pathwayVersionId: string;
  };

  const checklistItemRow = await patientPathwayPrismaRepository.findChecklistItemInPathwayVersion(
    itemId,
    patientPathway.pathwayVersionId,
  );
  if (!checklistItemRow || typeof checklistItemRow !== "object") {
    return { ok: false, code: "ITEM_NOT_FOUND" };
  }
  const checklistItem = checklistItemRow as { id: string; pathwayStageId: string };

  if (checklistItem.pathwayStageId !== patientPathway.currentStageId) {
    return { ok: false, code: "WRONG_STAGE" };
  }

  const completedAt = parsed.completed ? new Date() : null;
  const completedByUserId = parsed.completed ? actorUserId : null;

  const progress = await patientPathwayPrismaRepository.upsertPatientChecklistItemProgress({
    patientPathwayId: patientPathway.id,
    checklistItemId: checklistItem.id,
    completedAt,
    completedByUserId,
  });
  const p = progress as { checklistItemId: string; completedAt: Date | null };

  if (parsed.completed) {
    const totalItems = await patientPathwayPrismaRepository.countChecklistItemsOnStage(
      patientPathway.currentStageId,
    );
    const completedItems = await patientPathwayPrismaRepository.countCompletedChecklistItemsOnStage(
      patientPathway.id,
      patientPathway.currentStageId,
    );

    if (totalItems > 0 && completedItems >= totalItems) {
      const pp = await patientPathwayPrismaRepository.findPatientPathwayForChecklistCompleteNotification(
        patientPathway.id,
      );
      if (pp && typeof pp === "object") {
        const row = pp as {
          tenantId: string;
          clientId: string;
          currentStageAssigneeUserId: string | null;
          client: { name: string };
          currentStage: { name: string };
        };
        const checklistTargets = await resolvePathwayNotificationTargetUserIds({
          tenantId,
          type: "checklist_complete",
          currentStageAssigneeUserId: row.currentStageAssigneeUserId,
        });
        notificationEmitter
          .emit({
            tenantId,
            type: "checklist_complete",
            title: `Checklist completo: ${row.client.name}`,
            body: `Todos os itens da etapa "${row.currentStage.name}" foram concluídos.`,
            targetUserIds: checklistTargets,
            correlationId: `${patientPathway.id}:${patientPathway.currentStageId}`,
            metadata: {
              clientId: row.clientId,
              patientPathwayId: patientPathway.id,
              stageName: row.currentStage.name,
            },
          })
          .catch((err) => console.error("[notification] checklist_complete emit failed:", err));
      }
    }
  }

  await auditEventPrismaRepository.recordCanonical({
    tenantId,
    clientId: patientPathway.clientId,
    patientPathwayId: patientPathway.id,
    actorUserId,
    eventType: AuditEventType.CHECKLIST_ITEM_TOGGLED,
    payload: {
      itemId: checklistItem.id,
      checked: parsed.completed,
      userId: actorUserId,
    },
  });

  return {
    ok: true,
    item: {
      checklistItemId: p.checklistItemId,
      completed: p.completedAt != null,
      completedAt: p.completedAt?.toISOString() ?? null,
    },
  };
}
