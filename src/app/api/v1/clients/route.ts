import { prisma } from "@/infrastructure/database/prisma";
import { buildPagination } from "@/lib/api/pagination";
import { getApiT } from "@/lib/api/i18n";
import { joinTranslatedZodIssues } from "@/lib/api/zod-i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { validateClientOptionalRefs } from "@/lib/clients/validate-client-optional-refs";
import { computeSlaHealthStatus } from "@/lib/pathway/sla-health";
import { postClientBodySchema } from "@/lib/validators/client";
import { clientsListQuerySchema } from "@/lib/validators/clients-list-query";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Tamanho do lote quando o status SLA exige cálculo em memória. */
const STATUS_FILTER_SCAN_BATCH = 400;

/** Jornada mais recente (ativa ou concluída), para a listagem não “sumir” o contexto após concluir tratamento. */
const listInclude = {
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

type ClientListRow = Prisma.ClientGetPayload<{ include: typeof listInclude }>;

function clientSearchWhere(q: string): Prisma.ClientWhereInput {
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

function baseClientFields(c: ClientListRow) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    caseDescription: c.caseDescription,
    documentId: c.documentId,
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

function serializeClientListItem(c: ClientListRow, now: Date) {
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

export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const ctx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (ctx.response) return ctx.response;
  const { tenantId } = ctx;
  const forbidden = await assertActiveTenantMembership(auth.session!, tenantId, request, apiT);
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const parsed = clientsListQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    pathwayId: url.searchParams.get("pathwayId") ?? undefined,
    stageId: url.searchParams.get("stageId") ?? undefined,
    status: url.searchParams.get("status") || undefined,
  });
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const { limit, page, q, pathwayId, stageId, status: statusFilter } = parsed.data;
  const offset = (page - 1) * limit;
  const now = new Date();

  const ppFilter: Prisma.PatientPathwayWhereInput = { tenantId };
  if (pathwayId) ppFilter.pathwayId = pathwayId;
  if (stageId) ppFilter.currentStageId = stageId;

  const hasPpFilter = Boolean(pathwayId || stageId);

  const where: Prisma.ClientWhereInput = {
    tenantId,
    deletedAt: null,
    ...(q ? clientSearchWhere(q) : {}),
    ...(hasPpFilter ? { patientPathways: { some: ppFilter } } : {}),
  };

  if (statusFilter) {
    const pageRows: ReturnType<typeof serializeClientListItem>[] = [];
    let matchedCount = 0;
    let skip = 0;

    while (true) {
      const batch = await prisma.client.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: STATUS_FILTER_SCAN_BATCH,
        skip,
        include: listInclude,
      });
      if (batch.length === 0) break;

      for (const client of batch) {
        const row = serializeClientListItem(client, now);
        const matchesStatus =
          statusFilter === "completed"
            ? row.journeyCompletedAt != null
            : row.slaStatus === statusFilter;
        if (!matchesStatus) continue;
        if (matchedCount >= offset && pageRows.length < limit) {
          pageRows.push(row);
        }
        matchedCount += 1;
      }

      if (batch.length < STATUS_FILTER_SCAN_BATCH) break;
      skip += batch.length;
    }

    return jsonSuccess({
      data: pageRows,
      pagination: buildPagination(page, limit, matchedCount),
      statusFilterCapped: false,
    });
  }

  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
      include: listInclude,
    }),
    prisma.client.count({ where }),
  ]);

  return jsonSuccess({
    data: items.map((c) => serializeClientListItem(c, now)),
    pagination: buildPagination(page, limit, total),
    statusFilterCapped: false,
  });
}

export async function POST(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const ctx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (ctx.response) return ctx.response;
  const { tenantId } = ctx;
  const forbidden = await assertActiveTenantMembership(auth.session!, tenantId, request, apiT);
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postClientBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      joinTranslatedZodIssues(parsed.error, apiT as (key: string) => string),
      422,
    );
  }

  const refErr = await validateClientOptionalRefs(
    tenantId,
    {
      assignedToUserId: parsed.data.assignedToUserId,
      opmeSupplierId: parsed.data.opmeSupplierId,
    },
    apiT,
  );
  if (refErr) return refErr;

  const row = await prisma.client.create({
    data: {
      tenantId,
      name: parsed.data.name.trim(),
      phone: parsed.data.phone.trim(),
      email: parsed.data.email ?? null,
      caseDescription: parsed.data.caseDescription?.trim() || null,
      documentId: parsed.data.documentId,
      assignedToUserId: parsed.data.assignedToUserId ?? null,
      opmeSupplierId: parsed.data.opmeSupplierId ?? null,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      caseDescription: true,
      documentId: true,
      assignedToUserId: true,
      opmeSupplierId: true,
      createdAt: true,
      updatedAt: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      opmeSupplier: { select: { id: true, name: true } },
      patientPathways: { where: { completedAt: null }, take: 1, orderBy: { createdAt: "desc" }, select: { id: true } },
    },
  });

  return jsonSuccess(
    {
      client: {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        caseDescription: row.caseDescription,
        documentId: row.documentId,
        assignedToUserId: row.assignedToUserId,
        opmeSupplierId: row.opmeSupplierId,
        assignedTo: row.assignedTo
          ? { id: row.assignedTo.id, name: row.assignedTo.name, email: row.assignedTo.email }
          : null,
        opmeSupplier: row.opmeSupplier ? { id: row.opmeSupplier.id, name: row.opmeSupplier.name } : null,
        patientPathwayId: row.patientPathways?.[0]?.id ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
