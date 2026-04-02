import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { joinTranslatedZodIssues } from "@/lib/api/zod-i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { findTenantClientVisibleToSession } from "@/lib/auth/client-visibility";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import {
  clientDetailPatientPathwaySelect,
  collectPathwayStageDefaultAssigneeUserIds,
  MAX_COMPLETED_TRANSITIONS,
  type ClientDetailStageTransitionRow,
  serializeActivePatientPathwayDetail,
  serializeCompletedTreatment,
} from "@/lib/clients/client-detail-pathway-serialization";
import { loadStageAssigneeSummariesMap } from "@/lib/clients/load-stage-assignee-summaries";
import { validateClientOptionalRefs } from "@/lib/clients/validate-client-optional-refs";
import { TenantRole, type Prisma } from "@prisma/client";
import { clientDetailQuerySchema } from "@/lib/validators/client-detail-query";
import { digitsOnlyCpf } from "@/lib/validators/cpf";
import { patchClientBodySchema } from "@/lib/validators/client";

export const dynamic = "force-dynamic";

const stageTransitionDetailInclude = {
  fromStage: { select: { id: true, name: true, stageKey: true } },
  toStage: { select: { id: true, name: true, stageKey: true } },
  actor: { select: { id: true, name: true, email: true } },
  forcedByUser: { select: { id: true, name: true, email: true } },
} satisfies Prisma.StageTransitionInclude;

type RouteCtx = { params: Promise<{ clientId: string }> };

export async function GET(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;
  const forbidden = await assertActiveTenantMembership(auth.session!, tenantCtx.tenantId, request, apiT);
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const parsedQ = clientDetailQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsedQ.success) {
    return jsonError("VALIDATION_ERROR", parsedQ.error.flatten().formErrors.join("; "), 422);
  }
  const { page, limit } = parsedQ.data;
  const offset = (page - 1) * limit;
  const now = new Date();

  const { clientId } = await ctx.params;

  const row = await findTenantClientVisibleToSession(auth.session!, tenantCtx.tenantId, clientId, {
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
  });

  if (!row) {
    return jsonError("NOT_FOUND", apiT("errors.patientNotFound"), 404);
  }

  const [activePp, completedPps] = await Promise.all([
    prisma.patientPathway.findFirst({
      where: { clientId, tenantId: tenantCtx.tenantId, completedAt: null },
      orderBy: { updatedAt: "desc" },
      select: clientDetailPatientPathwaySelect,
    }),
    prisma.patientPathway.findMany({
      where: { clientId, tenantId: tenantCtx.tenantId, completedAt: { not: null } },
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
    return jsonSuccess({
      client,
      patientPathway: null,
      completedTreatments,
    });
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

  return jsonSuccess({
    client,
    patientPathway,
    completedTreatments,
  });
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;
  const forbidden = await assertActiveTenantMembership(auth.session!, tenantCtx.tenantId, request, apiT);
  if (forbidden) return forbidden;

  const { clientId } = await ctx.params;
  const existing = await findTenantClientVisibleToSession(auth.session!, tenantCtx.tenantId, clientId, {
    id: true,
    tenantId: true,
  });
  if (!existing) {
    return jsonError("NOT_FOUND", apiT("errors.patientNotFound"), 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = patchClientBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      joinTranslatedZodIssues(parsed.error, apiT as (key: string) => string),
      422,
    );
  }

  const refErr = await validateClientOptionalRefs(
    tenantCtx.tenantId,
    {
      assignedToUserId: parsed.data.assignedToUserId === undefined ? undefined : parsed.data.assignedToUserId,
      opmeSupplierId: parsed.data.opmeSupplierId === undefined ? undefined : parsed.data.opmeSupplierId,
    },
    apiT,
  );
  if (refErr) return refErr;

  const data: {
    name?: string;
    phone?: string;
    email?: string | null;
    caseDescription?: string | null;
    documentId?: string | null;
    assignedToUserId?: string | null;
    opmeSupplierId?: string | null;
  } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
  if (parsed.data.phone !== undefined) data.phone = parsed.data.phone.trim();
  if (parsed.data.email !== undefined) data.email = parsed.data.email;
  if (parsed.data.caseDescription !== undefined) {
    data.caseDescription =
      parsed.data.caseDescription === null ? null : parsed.data.caseDescription.trim() || null;
  }
  if (parsed.data.documentId !== undefined && parsed.data.documentId !== null) {
    data.documentId = digitsOnlyCpf(parsed.data.documentId);
  }
  if (parsed.data.assignedToUserId !== undefined) data.assignedToUserId = parsed.data.assignedToUserId;
  if (parsed.data.opmeSupplierId !== undefined) data.opmeSupplierId = parsed.data.opmeSupplierId;

  if (Object.keys(data).length === 0) {
    return jsonError("VALIDATION_ERROR", apiT("errors.noFieldsToUpdate"), 422);
  }

  const row = await prisma.client.update({
    where: { id: existing.id },
    data,
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

  return jsonSuccess({
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
  });
}

export async function DELETE(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;
  const forbidden = await assertActiveTenantMembership(auth.session!, tenantCtx.tenantId, request, apiT);
  if (forbidden) return forbidden;

  if (auth.session!.user.globalRole !== "super_admin") {
    const m = await prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId: auth.session!.user.id, tenantId: tenantCtx.tenantId } },
    });
    if (!m || m.role !== TenantRole.tenant_admin) {
      return jsonError("FORBIDDEN", apiT("errors.deletePatientForbidden"), 403);
    }
  }

  const { clientId } = await ctx.params;
  const existing = await findTenantClientVisibleToSession(auth.session!, tenantCtx.tenantId, clientId, {
    id: true,
  });
  if (!existing) {
    return jsonError("NOT_FOUND", apiT("errors.patientNotFound"), 404);
  }

  const now = new Date();
  await prisma.client.update({
    where: { id: existing.id },
    data: {
      deletedAt: now,
      deletedByUserId: auth.session!.user.id,
    },
  });

  return jsonSuccess({ message: apiT("success.clientRemoved") });
}
