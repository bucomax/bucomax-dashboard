import type { Prisma } from "@prisma/client";
import { computeSlaHealthStatus } from "@/lib/pathway/sla-health";
import type { ClientDto } from "@/types/api/clients-v1";

/** Include alinhado a `GET /api/v1/clients` (listagem). */
export const CLIENT_LIST_INCLUDE = {
  assignedTo: { select: { id: true, name: true, email: true } },
  opmeSupplier: { select: { id: true, name: true } },
  patientPathways: {
    orderBy: { updatedAt: "desc" as const },
    take: 1,
    select: {
      id: true,
      completedAt: true,
      pathwayId: true,
      enteredStageAt: true,
      pathway: { select: { name: true } },
      currentStage: {
        select: {
          id: true,
          name: true,
          alertWarningDays: true,
          alertCriticalDays: true,
        },
      },
    },
  },
} satisfies Prisma.ClientInclude;

export type ClientListRow = Prisma.ClientGetPayload<{ include: typeof CLIENT_LIST_INCLUDE }>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function clientSearchWhere(q: string): Prisma.ClientWhereInput {
  const qDigits = q.replace(/\D/g, "");
  const or: Prisma.ClientWhereInput[] = [
    { name: { contains: q, mode: "insensitive" } },
    { phone: { contains: q, mode: "insensitive" } },
    { email: { contains: q, mode: "insensitive" } },
  ];
  if (qDigits.length > 0) {
    or.push({ documentId: { contains: qDigits, mode: "insensitive" } });
  }
  return { OR: or };
}

export function buildClientsListBaseWhere(input: {
  tenantId: string;
  q?: string;
  pathwayId?: string;
  stageId?: string;
}): Prisma.ClientWhereInput {
  const { tenantId, q, pathwayId, stageId } = input;
  const ppFilter: Prisma.PatientPathwayWhereInput = { tenantId };
  if (pathwayId) ppFilter.pathwayId = pathwayId;
  if (stageId) ppFilter.currentStageId = stageId;
  const hasPpFilter = Boolean(pathwayId || stageId);
  return {
    tenantId,
    deletedAt: null,
    ...(q ? clientSearchWhere(q) : {}),
    ...(hasPpFilter ? { patientPathways: { some: ppFilter } } : {}),
  };
}

function baseClientFields(c: ClientListRow) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    caseDescription: c.caseDescription,
    documentId: c.documentId,
    postalCode: c.postalCode,
    addressLine: c.addressLine,
    addressNumber: c.addressNumber,
    addressComp: c.addressComp,
    neighborhood: c.neighborhood,
    city: c.city,
    state: c.state,
    isMinor: c.isMinor,
    guardianName: c.guardianName,
    guardianDocumentId: c.guardianDocumentId,
    guardianPhone: c.guardianPhone,
    assignedToUserId: c.assignedToUserId,
    opmeSupplierId: c.opmeSupplierId,
    assignedTo: c.assignedTo
      ? { id: c.assignedTo.id, name: c.assignedTo.name, email: c.assignedTo.email }
      : null,
    opmeSupplier: c.opmeSupplier ? { id: c.opmeSupplier.id, name: c.opmeSupplier.name } : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

/** Monta `ClientDto` a partir de linha Prisma (ex.: `POST`/`PATCH` com `select` + relações). */
export function mapPrismaClientRowToClientDto(row: {
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
  patientPathways?: { id: string }[];
}): ClientDto {
  return {
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
    patientPathwayId: row.patientPathways?.[0]?.id ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeClientListItem(c: ClientListRow, now: Date) {
  const pp = c.patientPathways?.[0] ?? null;
  if (!pp) {
    return {
      ...baseClientFields(c),
      patientPathwayId: null,
      pathwayId: null,
      pathwayName: null,
      currentStageId: null,
      currentStageName: null,
      daysInStage: null,
      slaStatus: null,
      journeyCompletedAt: null,
    };
  }

  if (pp.completedAt) {
    return {
      ...baseClientFields(c),
      patientPathwayId: pp.id,
      pathwayId: pp.pathwayId,
      pathwayName: pp.pathway.name,
      currentStageId: null,
      currentStageName: null,
      daysInStage: null,
      slaStatus: null,
      journeyCompletedAt: pp.completedAt.toISOString(),
    };
  }

  const daysInStage = Math.floor((now.getTime() - pp.enteredStageAt.getTime()) / MS_PER_DAY);
  const slaStatus = computeSlaHealthStatus(
    pp.enteredStageAt,
    now,
    pp.currentStage.alertWarningDays,
    pp.currentStage.alertCriticalDays,
  );

  return {
    ...baseClientFields(c),
    patientPathwayId: pp.id,
    pathwayId: pp.pathwayId,
    pathwayName: pp.pathway.name,
    currentStageId: pp.currentStage.id,
    currentStageName: pp.currentStage.name,
    daysInStage,
    slaStatus,
    journeyCompletedAt: null,
  };
}

/** Após `unstable_cache`, o Next serializa `Date` como string — reidrata para o SLA usar `now` atual. */
export function reviveClientListRows(raw: unknown): ClientListRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(reviveClientListRow);
}

function reviveClientListRow(raw: unknown): ClientListRow {
  const c = raw as Record<string, unknown>;
  const ppsRaw = c.patientPathways;
  const patientPathways = Array.isArray(ppsRaw)
    ? ppsRaw.map((pp) => {
        const row = pp as Record<string, unknown>;
        const cs = row.currentStage as Record<string, unknown> | null;
        return {
          ...row,
          enteredStageAt: toDate(row.enteredStageAt),
          completedAt: row.completedAt ? toDate(row.completedAt) : null,
          pathway: row.pathway,
          currentStage: cs
            ? {
                ...cs,
                alertWarningDays: Number(cs.alertWarningDays),
                alertCriticalDays: Number(cs.alertCriticalDays),
              }
            : null,
        };
      })
    : [];

  return {
    ...c,
    createdAt: toDate(c.createdAt),
    updatedAt: toDate(c.updatedAt),
    assignedTo: c.assignedTo,
    opmeSupplier: c.opmeSupplier,
    patientPathways,
  } as ClientListRow;
}

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date(NaN);
}
