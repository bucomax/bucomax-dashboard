import type { ApiT } from "@/lib/api/i18n";
import { prisma } from "@/infrastructure/database/prisma";
import { jsonError } from "@/lib/api-response";
import { getPatientPortalSessionFromCookies, type PatientPortalSessionPayload } from "./patient-portal-session";

export type PatientPortalRequestOk = {
  portal: PatientPortalSessionPayload;
};

export type PatientPortalRequestResult =
  | { ok: true; data: PatientPortalRequestOk }
  | { ok: false; response: Response };

/**
 * Cookie do portal + paciente ativo no tenant (não removido).
 */
export async function requireActivePatientPortalClient(apiT: ApiT): Promise<PatientPortalRequestResult> {
  const portal = await getPatientPortalSessionFromCookies();
  if (!portal) {
    return { ok: false, response: jsonError("UNAUTHORIZED", apiT("errors.patientPortalSessionRequired"), 401) };
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
