import { prisma } from "@/infrastructure/database/prisma";
import type { Prisma } from "@prisma/client";
import {
  clientDetailPatientPathwaySelect,
  collectPathwayStageDefaultAssigneeUserIds,
  MAX_COMPLETED_TRANSITIONS,
  type ClientDetailStageTransitionRow,
  serializeActivePatientPathwayDetail,
  serializeCompletedTreatment,
} from "@/lib/clients/client-detail-pathway-serialization";
import { loadStageAssigneeSummariesMap } from "@/lib/clients/load-stage-assignee-summaries";
import type { ClientDetailResponseData } from "@/types/api/clients-v1";

const stageTransitionDetailInclude = {
  fromStage: { select: { id: true, name: true, stageKey: true } },
  toStage: { select: { id: true, name: true, stageKey: true } },
  actor: { select: { id: true, name: true, email: true } },
  forcedByUser: { select: { id: true, name: true, email: true } },
} satisfies Prisma.StageTransitionInclude;

/** Linha mínima do `Client` para montar o DTO da ficha (staff ou portal). */
export type ClientDetailClientRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  caseDescription: string | null;
  documentId: string | null;
  postalCode: string | null;
  addressLine: string | null;
  addressNumber: string | null;
  addressComp: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  isMinor: boolean;
  guardianName: string | null;
  guardianDocumentId: string | null;
  guardianPhone: string | null;
  assignedToUserId: string | null;
  opmeSupplierId: string | null;
  createdAt: Date;
  updatedAt: Date;
  assignedTo: { id: string; name: string | null; email: string } | null;
  opmeSupplier: { id: string; name: string } | null;
};

export async function loadClientDetailResponseData(
  tenantId: string,
  row: ClientDetailClientRow,
  page: number,
  limit: number,
): Promise<ClientDetailResponseData> {
  const clientId = row.id;
  const offset = (page - 1) * limit;
  const now = new Date();

  const [activePp, completedPps] = await Promise.all([
    prisma.patientPathway.findFirst({
      where: { clientId, tenantId, completedAt: null },
      orderBy: { updatedAt: "desc" },
      select: clientDetailPatientPathwaySelect,
    }),
    prisma.patientPathway.findMany({
      where: { clientId, tenantId, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      select: clientDetailPatientPathwaySelect,
    }),
  ]);

  const pathwaysForAssigneeLabels = [activePp, ...completedPps].filter((p) => p != null);
  const assigneeByUserId = await loadStageAssigneeSummariesMap(
    pathwaysForAssigneeLabels.flatMap(collectPathwayStageDefaultAssigneeUserIds),
  );

  const client = {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    caseDescription: row.caseDescription,
    documentId: row.documentId,
    postalCode: row.postalCode,
    addressLine: row.addressLine,
    addressNumber: row.addressNumber,
    addressComp: row.addressComp,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    isMinor: row.isMinor,
    guardianName: row.guardianName,
    guardianDocumentId: row.guardianDocumentId,
    guardianPhone: row.guardianPhone,
    assignedToUserId: row.assignedToUserId,
    opmeSupplierId: row.opmeSupplierId,
    assignedTo: row.assignedTo
      ? { id: row.assignedTo.id, name: row.assignedTo.name, email: row.assignedTo.email }
      : null,
    opmeSupplier: row.opmeSupplier ? { id: row.opmeSupplier.id, name: row.opmeSupplier.name } : null,
    patientPathwayId: activePp?.id ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };

  const completedTransitionBatches = await Promise.all(
    completedPps.map((pp) =>
      prisma.stageTransition.findMany({
        where: { patientPathwayId: pp.id },
        orderBy: { createdAt: "asc" },
        take: MAX_COMPLETED_TRANSITIONS + 1,
        include: stageTransitionDetailInclude,
      }),
    ),
  );

  const completedTreatments = completedPps.map((pp, i) => {
    const raw = completedTransitionBatches[i] ?? [];
    const truncated = raw.length > MAX_COMPLETED_TRANSITIONS;
    return serializeCompletedTreatment(pp, raw.slice(0, MAX_COMPLETED_TRANSITIONS), {
      transitionsTruncated: truncated,
      assigneeByUserId,
    });
  });

  if (!activePp) {
    return {
      client,
      patientPathway: null,
      completedTreatments,
    };
  }

  const [totalTransitions, transitionRows, entryToCurrentRaw] = await Promise.all([
    prisma.stageTransition.count({ where: { patientPathwayId: activePp.id } }),
    prisma.stageTransition.findMany({
      where: { patientPathwayId: activePp.id },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: stageTransitionDetailInclude,
    }),
    prisma.stageTransition.findFirst({
      where: { patientPathwayId: activePp.id, toStageId: activePp.currentStage.id },
      orderBy: { createdAt: "desc" },
      include: stageTransitionDetailInclude,
    }),
  ]);

  const entryToCurrentStageTransition: ClientDetailStageTransitionRow | null = entryToCurrentRaw
    ? {
        id: entryToCurrentRaw.id,
        note: entryToCurrentRaw.note,
        ruleOverrideReason: entryToCurrentRaw.ruleOverrideReason,
        createdAt: entryToCurrentRaw.createdAt,
        fromStage: entryToCurrentRaw.fromStage,
        toStage: entryToCurrentRaw.toStage,
        actor: entryToCurrentRaw.actor,
        forcedByUser: entryToCurrentRaw.forcedByUser,
      }
    : null;

  const transitionRowsMapped: ClientDetailStageTransitionRow[] = transitionRows.map((tr) => ({
    id: tr.id,
    note: tr.note,
    ruleOverrideReason: tr.ruleOverrideReason,
    createdAt: tr.createdAt,
    fromStage: tr.fromStage,
    toStage: tr.toStage,
    actor: tr.actor,
    forcedByUser: tr.forcedByUser,
  }));

  const patientPathway = serializeActivePatientPathwayDetail(activePp, {
    now,
    transitionRows: transitionRowsMapped,
    totalTransitions,
    page,
    limit,
    entryToCurrentStageTransition,
    assigneeByUserId,
  });

  return {
    client,
    patientPathway,
    completedTreatments,
  };
}

/** Remove da ficha campos operacionais internos exibidos só à equipe. */
export function sanitizeClientDetailForPatientPortal(data: ClientDetailResponseData): ClientDetailResponseData {
  return {
    ...data,
    client: {
      ...data.client,
      caseDescription: null,
      assignedToUserId: null,
      opmeSupplierId: null,
      assignedTo: null,
      opmeSupplier: null,
    },
  };
}
