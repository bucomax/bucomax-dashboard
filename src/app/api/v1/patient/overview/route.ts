import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { requireActivePatientPortalClient } from "@/lib/auth/patient-portal-request";
import { loadPatientPortalOverview } from "@/application/use-cases/patient-portal/load-patient-portal-overview";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const portalCtx = await requireActivePatientPortalClient(request, apiT);
  if (!portalCtx.ok) return portalCtx.response;
  const portal = portalCtx.data.portal;

  const data = await loadPatientPortalOverview({
    tenantId: portal.tenantId,
    clientId: portal.clientId,
  });
  if (!data) {
    return jsonError("NOT_FOUND", apiT("errors.patientNotFound"), 404);
  }

  return jsonSuccess(data);
}
