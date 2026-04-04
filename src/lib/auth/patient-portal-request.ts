import type { ApiT } from "@/lib/api/i18n";
import { prisma } from "@/infrastructure/database/prisma";
import { jsonError } from "@/lib/api-response";
import { PATIENT_PORTAL_TENANT_SLUG_HEADER } from "@/lib/constants/patient-portal";
import { getPatientPortalSessionFromCookies, type PatientPortalSessionPayload } from "./patient-portal-session";

export type PatientPortalRequestOk = {
  portal: PatientPortalSessionPayload;
};

export type PatientPortalRequestResult =
  | { ok: true; data: PatientPortalRequestOk }
  | { ok: false; response: Response };

function readPortalTenantSlugHeader(request: Request): string {
  return request.headers.get(PATIENT_PORTAL_TENANT_SLUG_HEADER)?.trim() ?? "";
}

/**
 * Cookie do portal + slug da URL + paciente ativo no tenant (não removido).
 */
export async function requireActivePatientPortalClient(
  request: Request,
  apiT: ApiT,
): Promise<PatientPortalRequestResult> {
  const portal = await getPatientPortalSessionFromCookies();
  if (!portal) {
    return { ok: false, response: jsonError("UNAUTHORIZED", apiT("errors.patientPortalSessionRequired"), 401) };
  }
  const slug = readPortalTenantSlugHeader(request);
  if (!slug) {
    return { ok: false, response: jsonError("UNAUTHORIZED", apiT("errors.patientPortalTenantSlugRequired"), 401) };
  }
  if (portal.tenantSlug !== slug) {
    return { ok: false, response: jsonError("FORBIDDEN", apiT("errors.patientPortalTenantMismatch"), 403) };
  }
  const tenant = await prisma.tenant.findFirst({
    where: { id: portal.tenantId, slug, isActive: true },
    select: { id: true },
  });
  if (!tenant) {
    return { ok: false, response: jsonError("FORBIDDEN", apiT("errors.patientPortalTenantMismatch"), 403) };
  }
  const client = await prisma.client.findFirst({
    where: { id: portal.clientId, tenantId: portal.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!client) {
    return { ok: false, response: jsonError("NOT_FOUND", apiT("errors.patientNotFound"), 404) };
  }
  return { ok: true, data: { portal } };
}
