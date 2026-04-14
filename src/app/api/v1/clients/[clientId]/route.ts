import { revalidateTenantClientsList, revalidateTenantOpmeSuppliersList } from "@/infrastructure/cache/revalidate-tenant-lists";
import { AuditEventType, recordAuditEvent } from "@/infrastructure/audit/record-audit-event";
import { prisma } from "@/infrastructure/database/prisma";
import { TenantRole, type Prisma } from "@prisma/client";
import { getApiT } from "@/lib/api/i18n";
import { joinTranslatedZodIssues } from "@/lib/api/zod-i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { findTenantClientVisibleToSession } from "@/lib/auth/client-visibility";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { mapPrismaClientRowToClientDto } from "@/lib/clients/clients-list-shared";
import { loadClientDetailResponseData } from "@/lib/clients/load-client-detail-response";
import { validateClientOptionalRefs } from "@/lib/clients/validate-client-optional-refs";
import { clientDetailQuerySchema } from "@/lib/validators/client-detail-query";
import { digitsOnlyCpf } from "@/lib/validators/cpf";
import { patchClientBodySchema } from "@/lib/validators/client";

export const dynamic = "force-dynamic";

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

  const { clientId } = await ctx.params;

  const row = await findTenantClientVisibleToSession(auth.session!, tenantCtx.tenantId, clientId, {
    id: true,
    name: true,
    phone: true,
    email: true,
    caseDescription: true,
    documentId: true,
    postalCode: true,
    addressLine: true,
    addressNumber: true,
    addressComp: true,
    neighborhood: true,
    city: true,
    state: true,
    isMinor: true,
    guardianName: true,
    guardianDocumentId: true,
    guardianPhone: true,
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

  const payload = await loadClientDetailResponseData(tenantCtx.tenantId, row, page, limit);
  return jsonSuccess(payload);
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

  const p = parsed.data;
  const data: Prisma.ClientUncheckedUpdateInput = {};
  if (p.name !== undefined) data.name = p.name.trim();
  if (p.phone !== undefined) data.phone = p.phone.trim();
  if (p.email !== undefined) data.email = p.email;
  if (p.caseDescription !== undefined) {
    data.caseDescription = p.caseDescription === null ? null : p.caseDescription.trim() || null;
  }
  if (p.documentId !== undefined) {
    data.documentId = p.documentId === null ? null : digitsOnlyCpf(p.documentId);
  }
  if (p.assignedToUserId !== undefined) data.assignedToUserId = p.assignedToUserId;
  if (p.opmeSupplierId !== undefined) data.opmeSupplierId = p.opmeSupplierId;
  if (p.postalCode !== undefined) data.postalCode = p.postalCode;
  if (p.addressLine !== undefined) data.addressLine = p.addressLine;
  if (p.addressNumber !== undefined) data.addressNumber = p.addressNumber;
  if (p.addressComp !== undefined) data.addressComp = p.addressComp;
  if (p.neighborhood !== undefined) data.neighborhood = p.neighborhood;
  if (p.city !== undefined) data.city = p.city;
  if (p.state !== undefined) data.state = p.state;
  if (p.isMinor !== undefined) data.isMinor = p.isMinor;
  if (p.guardianName !== undefined) data.guardianName = p.guardianName;
  if (p.guardianDocumentId !== undefined) {
    data.guardianDocumentId =
      p.guardianDocumentId === null ? null : digitsOnlyCpf(p.guardianDocumentId);
  }
  if (p.guardianPhone !== undefined) data.guardianPhone = p.guardianPhone;

  if (p.isMinor === false) {
    data.guardianName = null;
    data.guardianDocumentId = null;
    data.guardianPhone = null;
  }

  if (Object.keys(data).length === 0) {
    return jsonError("VALIDATION_ERROR", apiT("errors.noFieldsToUpdate"), 422);
  }

  const opmeChanged = parsed.data.opmeSupplierId !== undefined;
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
      postalCode: true,
      addressLine: true,
      addressNumber: true,
      addressComp: true,
      neighborhood: true,
      city: true,
      state: true,
      isMinor: true,
      guardianName: true,
      guardianDocumentId: true,
      guardianPhone: true,
      assignedToUserId: true,
      opmeSupplierId: true,
      createdAt: true,
      updatedAt: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      opmeSupplier: { select: { id: true, name: true } },
      patientPathways: { where: { completedAt: null }, take: 1, orderBy: { createdAt: "desc" }, select: { id: true } },
    },
  });

  revalidateTenantClientsList(tenantCtx.tenantId);
  if (opmeChanged) {
    revalidateTenantOpmeSuppliersList(tenantCtx.tenantId);
  }

  const changedFields = Object.keys(data).filter((k) => k !== "updatedAt");
  await recordAuditEvent(prisma, {
    tenantId: tenantCtx.tenantId,
    clientId: existing.id,
    patientPathwayId: null,
    actorUserId: auth.session!.user.id,
    type: AuditEventType.PATIENT_UPDATED,
    payload: { clientId: existing.id, changedFields },
  });

  return jsonSuccess({
    client: mapPrismaClientRowToClientDto(row),
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

  revalidateTenantClientsList(tenantCtx.tenantId);
  revalidateTenantOpmeSuppliersList(tenantCtx.tenantId);

  await recordAuditEvent(prisma, {
    tenantId: tenantCtx.tenantId,
    clientId: existing.id,
    patientPathwayId: null,
    actorUserId: auth.session!.user.id,
    type: AuditEventType.PATIENT_DELETED,
    payload: { clientId: existing.id, deletedByUserId: auth.session!.user.id },
  });

  return jsonSuccess({ message: apiT("success.clientRemoved") });
}
