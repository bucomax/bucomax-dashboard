import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { requireActivePatientPortalClient } from "@/lib/auth/patient-portal-request";
import {
  loadClientDetailResponseData,
  sanitizeClientDetailForPatientPortal,
} from "@/lib/clients/load-client-detail-response";
import { prisma } from "@/infrastructure/database/prisma";
import { clientDetailQuerySchema } from "@/lib/validators/client-detail-query";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const portalCtx = await requireActivePatientPortalClient(request, apiT);
  if (!portalCtx.ok) return portalCtx.response;
  const portal = portalCtx.data.portal;

  const url = new URL(request.url);
  const parsedQ = clientDetailQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsedQ.success) {
    return jsonError("VALIDATION_ERROR", parsedQ.error.flatten().formErrors.join("; "), 422);
  }
  const { page, limit } = parsedQ.data;

  const row = await prisma.client.findFirst({
    where: { id: portal.clientId, tenantId: portal.tenantId, deletedAt: null },
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
      portalPasswordHash: true,
      createdAt: true,
      updatedAt: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      opmeSupplier: { select: { id: true, name: true } },
    },
  });
  if (!row) {
    return jsonError("NOT_FOUND", apiT("errors.patientNotFound"), 404);
  }

  const [payload, tenantRow] = await Promise.all([
    loadClientDetailResponseData(portal.tenantId, row, page, limit),
    prisma.tenant.findUnique({
      where: { id: portal.tenantId },
      select: { name: true },
    }),
  ]);

  const hasPortalPassword = row.portalPasswordHash != null;

  return jsonSuccess({
    ...sanitizeClientDetailForPatientPortal(payload),
    tenant: { name: tenantRow?.name ?? "—" },
    hasPortalPassword,
  });
}
