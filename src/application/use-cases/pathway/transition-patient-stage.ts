import type { PathwayStage, Prisma } from "@prisma/client";
import type { z } from "zod";

import { revalidateTenantClientsList } from "@/infrastructure/cache/revalidate-tenant-lists";
import { recordAuditEvent, AuditEventType } from "@/infrastructure/audit/record-audit-event";
import { pathwayPrismaRepository } from "@/infrastructure/repositories/pathway.repository";
import { patientPathwayPrismaRepository } from "@/infrastructure/repositories/patient-pathway.repository";
import { notificationEmitter } from "@/infrastructure/notifications/notification-emitter";
import { enqueueEmailDispatch } from "@/infrastructure/email/email-dispatch-emitter";
import { enqueueWhatsAppDispatch } from "@/infrastructure/whatsapp/whatsapp-dispatch-emitter";
import { getPublicAppUrl } from "@/lib/config/urls";
import { tenantPrismaRepository } from "@/infrastructure/repositories/tenant.repository";
import {
  buildStageDispatchStub,
  getStageDocumentBundle,
  type StageDocumentBundleItem,
} from "@/application/use-cases/pathway/build-stage-dispatch";
import { resolvePathwayNotificationTargetUserIds } from "@/application/use-cases/notification/resolve-notification-targets";
import { resolvePatientPathwayStageAssigneeUserId } from "@/application/use-cases/shared/validate-tenant-members";
import { pathwayChecklistPrismaRepository } from "@/infrastructure/repositories/pathway-checklist.repository";
import { postStageTransitionBodySchema } from "@/lib/validators/pathway";

export type StageTransitionInput = z.infer<typeof postStageTransitionBodySchema>;

export { postStageTransitionBodySchema };

/**
 * Itens obrigatórios de checklist ainda pendentes na etapa atual (transição de etapa).
 */
export async function listPendingRequiredChecklistItems(
  tx: unknown,
  patientPathwayId: string,
  currentStageId: string,
): Promise<{ id: string; label: string }[]> {
  return pathwayChecklistPrismaRepository.listPendingRequiredForTransition(
    tx,
    patientPathwayId,
    currentStageId,
  );
}

export type TransitionPatientStageErrorCode =
  | "PATIENT_PATHWAY_NOT_FOUND"
  | "PATHWAY_ALREADY_COMPLETED"
  | "TARGET_STAGE_NOT_FOUND"
  | "ALREADY_IN_TARGET_STAGE"
  | "LOCK_CONFLICT"
  | "INTERNAL_AFTER_TX";

export type TransitionPatientStageResult =
  | {
      ok: true;
      data: {
        patientPathway: {
          id: string;
          currentStage: unknown;
          currentStageAssignee: { id: string; name: string | null; email: string } | null;
          enteredStageAt: string;
          updatedAt: string;
        };
      };
    }
  | { ok: false; code: TransitionPatientStageErrorCode }
  | { ok: false; code: "CHECKLIST_BLOCKED"; pendingItems: { id: string; label: string }[] };

/**
 * Transição de etapa: lock, transação (checklist, transição, audit, update PP), notificação, WhatsApp, cache.
 */
export async function runTransitionPatientStage(params: {
  tenantId: string;
  actorUserId: string;
  patientPathwayId: string;
  input: StageTransitionInput;
}): Promise<TransitionPatientStageResult> {
  const { tenantId, actorUserId, patientPathwayId, input: parsed } = params;

  const pp = await patientPathwayPrismaRepository.findForStageTransition(tenantId, patientPathwayId);
  if (!pp) {
    return { ok: false, code: "PATIENT_PATHWAY_NOT_FOUND" };
  }
  if (pp.completedAt) {
    return { ok: false, code: "PATHWAY_ALREADY_COMPLETED" };
  }

  const toStage = (await pathwayPrismaRepository.findPathwayStageInVersion(
    pp.pathwayVersionId,
    parsed.toStageId,
  )) as PathwayStage | null;
  if (!toStage) {
    return { ok: false, code: "TARGET_STAGE_NOT_FOUND" };
  }

  if (toStage.id === pp.currentStageId) {
    return { ok: false, code: "ALREADY_IN_TARGET_STAGE" };
  }

  const { tryAcquire, releaseLock } = await import("@/lib/api/distributed-lock");
  const lockKey = `lock:transition:${patientPathwayId}`;
  const acquired = await tryAcquire(lockKey, 10);
  if (!acquired) {
    return { ok: false, code: "LOCK_CONFLICT" };
  }

  let updated: {
    id: string;
    currentStage: unknown;
    currentStageAssignee: { id: string; name: string | null; email: string } | null;
    enteredStageAt: Date;
    updatedAt: Date;
    currentStageAssigneeUserId: string | null;
  } | null = null;
  let blockedPending: { id: string; label: string }[] | null = null;
  let whatsappEnqueue: {
    transitionId: string;
    documents: StageDocumentBundleItem[];
  } | null = null;
  let stageDocumentBundle: StageDocumentBundleItem[] = [];

  try {
    const txResult = await patientPathwayPrismaRepository.runInTransaction(async (txRaw) => {
      const tx = txRaw as Prisma.TransactionClient;
      const pendingRequired = await listPendingRequiredChecklistItems(tx, pp.id, pp.currentStageId);

      if (pendingRequired.length > 0 && !parsed.force) {
        return { outcome: "blocked" as const, pending: pendingRequired };
      }

      const overrideReasonTrimmed =
        pendingRequired.length > 0 && parsed.force ? (parsed.overrideReason?.trim() ?? "") : null;

      const documents = await getStageDocumentBundle(tx, toStage.id);

      const currentStageAssigneeUserId = await resolvePatientPathwayStageAssigneeUserId(
        tx,
        tenantId,
        {
          defaultAssigneeUserIds: toStage.defaultAssigneeUserIds,
          defaultAssigneeUserId: toStage.defaultAssigneeUserId,
        },
        pp.client.assignedToUserId,
      );

      const createdTransition = await tx.stageTransition.create({
        data: {
          patientPathwayId: pp.id,
          fromStageId: pp.currentStageId,
          toStageId: toStage.id,
          actorUserId,
          note: parsed.note?.trim() || null,
          ruleOverrideReason:
            overrideReasonTrimmed && overrideReasonTrimmed.length > 0 ? overrideReasonTrimmed : null,
          forcedByUserId: pendingRequired.length > 0 && parsed.force ? actorUserId : null,
          dispatchStub: buildStageDispatchStub({
            tenantId,
            clientId: pp.clientId,
            stageId: toStage.id,
            stageName: toStage.name,
            documents,
          }),
        },
        select: { id: true },
      });

      const forcedOverride = pendingRequired.length > 0 && Boolean(parsed.force);
      const auditOverrideReason =
        overrideReasonTrimmed && overrideReasonTrimmed.length > 0 ? overrideReasonTrimmed : null;
      await recordAuditEvent(tx, {
        tenantId,
        clientId: pp.clientId,
        patientPathwayId: pp.id,
        actorUserId,
        type: AuditEventType.STAGE_TRANSITION,
        payload: {
          transitionId: createdTransition.id,
          fromStageId: pp.currentStageId,
          toStageId: toStage.id,
          fromStageName: pp.currentStage?.name ?? null,
          toStageName: toStage.name,
          forcedOverride,
          ...(auditOverrideReason ? { ruleOverrideReason: auditOverrideReason } : {}),
        },
      });

      const nextPp = await tx.patientPathway.update({
        where: { id: pp.id },
        data: {
          currentStageId: toStage.id,
          enteredStageAt: new Date(),
          currentStageAssigneeUserId,
        },
        include: {
          currentStage: true,
          currentStageAssignee: { select: { id: true, name: true, email: true } },
        },
      });

      return {
        outcome: "ok" as const,
        patientPathway: nextPp,
        transitionId: createdTransition.id,
        documents,
      };
    });

    if (txResult.outcome === "blocked") {
      blockedPending = txResult.pending;
    } else {
      updated = txResult.patientPathway;
      stageDocumentBundle = txResult.documents;
      if (txResult.documents.length > 0 && pp.client.phone) {
        whatsappEnqueue = {
          transitionId: txResult.transitionId,
          documents: txResult.documents,
        };
      }
    }
  } finally {
    await releaseLock(lockKey);
  }

  if (blockedPending) {
    return { ok: false, code: "CHECKLIST_BLOCKED", pendingItems: blockedPending };
  }

  if (!updated) {
    return { ok: false, code: "INTERNAL_AFTER_TX" };
  }

  const stageTransitionTargets = await resolvePathwayNotificationTargetUserIds({
    tenantId,
    type: "stage_transition",
    currentStageAssigneeUserId: updated.currentStageAssigneeUserId,
  });

  notificationEmitter.emit({
    tenantId,
    type: "stage_transition",
    title: `${pp.client.name} avançou para ${toStage.name}`,
    targetUserIds: stageTransitionTargets,
    correlationId: `${pp.id}:${toStage.id}`,
    metadata: {
      clientId: pp.clientId,
      patientPathwayId: pp.id,
      fromStageId: pp.currentStageId,
      toStageId: toStage.id,
      stageName: toStage.name,
    },
  }).catch((err) => console.error("[notification] stage_transition emit failed:", err));

  const clientEmail = pp.client.email?.trim();
  if (clientEmail) {
    const tenantRow = await tenantPrismaRepository.findTenantNameAndSlugById(tenantId);
    const clinicName = tenantRow?.name?.trim() || "Clínica";
    const slug = tenantRow?.slug?.trim() ?? "";
    if (slug) {
      const portalUrl = `${getPublicAppUrl()}/${encodeURIComponent(slug)}/patient/login`;
      enqueueEmailDispatch(
        {
          kind: "stage_transition_patient",
          tenantId,
          to: clientEmail,
          data: {
            patientName: pp.client.name,
            stageName: toStage.name,
            patientMessage: toStage.patientMessage ?? null,
            documents: stageDocumentBundle.map((d) => ({ fileName: d.file.fileName })),
            portalUrl,
            clinicName,
          },
        },
        { jobId: `email|st|${tenantId}|${pp.id}|${toStage.id}`.replace(/:/g, "_") },
      ).catch((err) => console.error("[email] stage_transition patient enqueue failed:", err));
    }
  }

  if (whatsappEnqueue) {
    enqueueWhatsAppDispatch({
      tenantId,
      stageTransitionId: whatsappEnqueue.transitionId,
      clientId: pp.clientId,
      recipientPhone: pp.client.phone!,
      stageName: toStage.name,
      documents: whatsappEnqueue.documents.map((d) => ({
        fileName: d.file.fileName,
        r2Key: d.file.r2Key,
        mimeType: d.file.mimeType,
      })),
    }).catch((err) => console.error("[whatsapp] dispatch enqueue failed:", err));
  }

  revalidateTenantClientsList(tenantId);

  return {
    ok: true,
    data: {
      patientPathway: {
        id: updated.id,
        currentStage: updated.currentStage,
        currentStageAssignee: updated.currentStageAssignee
          ? {
              id: updated.currentStageAssignee.id,
              name: updated.currentStageAssignee.name,
              email: updated.currentStageAssignee.email,
            }
          : null,
        enteredStageAt: updated.enteredStageAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    },
  };
}
