import type { GuardianRelationship, PatientPreferredChannel } from "@prisma/client";
import {
  collectPathwayStageDefaultAssigneeUserIds,
  MAX_COMPLETED_TRANSITIONS,
  type ClientDetailStageTransitionRow,
  serializeActivePatientPathwayDetail,
  serializeCompletedTreatment,
} from "./serialize-client-detail";
import { formatClientBirthDateIso } from "./serialize-client-list";
import { clientDetailLoadPrismaRepository } from "@/infrastructure/repositories/client-detail-load.repository";
import { userPrismaRepository } from "@/infrastructure/repositories/user.repository";
import type { ClientDetailResponseData, StageAssigneeSummaryDto } from "@/types/api/clients-v1";

async function loadStageAssigneeSummariesMap(
  userIds: string[],
): Promise<Map<string, StageAssigneeSummaryDto>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const rows = await userPrismaRepository.findManyForStageAssigneeSummaries(unique);
  return new Map(
    rows.map((u) => [u.id, { id: u.id, name: u.name, email: u.email } satisfies StageAssigneeSummaryDto]),
  );
}

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
  birthDate: Date | null;
  guardianName: string | null;
  guardianDocumentId: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  guardianRelationship: GuardianRelationship | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  preferredChannel: PatientPreferredChannel;
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

  const [activePp, completedPps] = await clientDetailLoadPrismaRepository.loadActiveAndCompletedPathways(
    tenantId,
    clientId,
  );

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
    birthDate: formatClientBirthDateIso(row.birthDate),
    guardianName: row.guardianName,
    guardianDocumentId: row.guardianDocumentId,
    guardianPhone: row.guardianPhone,
    guardianEmail: row.guardianEmail,
    guardianRelationship: row.guardianRelationship,
    emergencyContactName: row.emergencyContactName,
    emergencyContactPhone: row.emergencyContactPhone,
    preferredChannel: row.preferredChannel,
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

  const completedTransitionBatches = await clientDetailLoadPrismaRepository.loadCompletedTransitionBatches(
    completedPps.map((pp) => pp.id),
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

  const [totalTransitions, transitionRows, entryToCurrentRaw] =
    await clientDetailLoadPrismaRepository.loadActivePathwayTransitionPage(
      activePp.id,
      activePp.currentStage.id,
      offset,
      limit,
    );

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
