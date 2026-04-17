import { getApiT } from "@/lib/api/i18n";
import { joinTranslatedZodIssues } from "@/lib/api/zod-i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { requireActivePatientPortalClient } from "@/lib/auth/patient-portal-request";
import { runPatchPatientPortalProfile } from "@/application/use-cases/patient-portal/patch-patient-portal-profile";
import { patchPatientPortalProfileBodySchema } from "@/lib/validators/patient-portal-profile";

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

  const result = await runPatchPatientPortalProfile({
    tenantId: portal.tenantId,
    clientId: portal.clientId,
    patch: parsed.data,
  });

  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      return jsonError("NOT_FOUND", apiT("errors.patientNotFound"), 404);
    }
    if (result.code === "CPF_INVALID") {
      return jsonError("VALIDATION_ERROR", apiT("errors.validationCpf11Digits"), 422);
    }
    return jsonError("VALIDATION_ERROR", apiT("errors.noFieldsToUpdate"), 422);
  }

  return jsonSuccess({ client: result.client });
}
