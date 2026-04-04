import { prisma } from "@/infrastructure/database/prisma";
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

  const data: {
    name?: string;
    phone?: string;
    email?: string | null;
    documentId?: string;
  } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
  if (parsed.data.phone !== undefined) data.phone = parsed.data.phone.trim();
  if (parsed.data.email !== undefined) {
    data.email = parsed.data.email === "" ? null : parsed.data.email.trim();
  }
  if (parsed.data.documentId !== undefined) {
    const digits = digitsOnlyCpf(parsed.data.documentId);
    if (digits.length !== 11) {
      return jsonError("VALIDATION_ERROR", apiT("errors.validationCpf11Digits"), 422);
    }
    data.documentId = digits;
  }

  if (Object.keys(data).length === 0) {
    return jsonError("VALIDATION_ERROR", apiT("errors.noFieldsToUpdate"), 422);
  }

  const existing = await prisma.client.findFirst({
    where: { id: portal.clientId, tenantId: portal.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return jsonError("NOT_FOUND", apiT("errors.patientNotFound"), 404);
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
      updatedAt: true,
    },
  });

  return jsonSuccess({
    client: {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      documentId: row.documentId,
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}
