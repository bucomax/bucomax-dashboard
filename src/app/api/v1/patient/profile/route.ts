import { revalidateTenantClientsList } from "@/infrastructure/cache/revalidate-tenant-lists";
import { prisma } from "@/infrastructure/database/prisma";
import type { Prisma } from "@prisma/client";
import { getApiT } from "@/lib/api/i18n";
import { joinTranslatedZodIssues } from "@/lib/api/zod-i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { requireActivePatientPortalClient } from "@/lib/auth/patient-portal-request";
import { patchPatientPortalProfileBodySchema } from "@/lib/validators/patient-portal-profile";
import { digitsOnlyCpf } from "@/lib/validators/cpf";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const apiT = await getApiT(request);
  const portalCtx = await requireActivePatientPortalClient(request, apiT);
  if (!portalCtx.ok) return portalCtx.response;
  const portal = portalCtx.data.portal;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = patchPatientPortalProfileBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      joinTranslatedZodIssues(parsed.error, apiT as (key: string) => string),
      422,
    );
  }

  const existing = await prisma.client.findFirst({
    where: { id: portal.clientId, tenantId: portal.tenantId, deletedAt: null },
    select: { id: true, isMinor: true },
  });
  if (!existing) {
    return jsonError("NOT_FOUND", apiT("errors.patientNotFound"), 404);
  }

  const p = parsed.data;
  const data: Prisma.ClientUncheckedUpdateInput = {};
  if (p.name !== undefined) data.name = p.name.trim();
  if (p.phone !== undefined) data.phone = p.phone.trim();
  if (p.email !== undefined) {
    data.email = p.email === "" ? null : p.email.trim();
  }
  if (p.documentId !== undefined) {
    const d = digitsOnlyCpf(p.documentId);
    if (existing.isMinor) {
      if (d.length > 0 && d.length !== 11) {
        return jsonError("VALIDATION_ERROR", apiT("errors.validationCpf11Digits"), 422);
      }
      data.documentId = d.length === 0 ? null : d;
    } else {
      if (d.length !== 11) {
        return jsonError("VALIDATION_ERROR", apiT("errors.validationCpf11Digits"), 422);
      }
      data.documentId = d;
    }
  }
  if (p.postalCode !== undefined) data.postalCode = p.postalCode;
  if (p.addressLine !== undefined) data.addressLine = p.addressLine;
  if (p.addressNumber !== undefined) data.addressNumber = p.addressNumber;
  if (p.addressComp !== undefined) data.addressComp = p.addressComp;
  if (p.neighborhood !== undefined) data.neighborhood = p.neighborhood;
  if (p.city !== undefined) data.city = p.city;
  if (p.state !== undefined) data.state = p.state;

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
      updatedAt: true,
    },
  });

  revalidateTenantClientsList(portal.tenantId);

  return jsonSuccess({
    client: {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
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
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}
