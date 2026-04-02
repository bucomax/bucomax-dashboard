import {
  buildTenantUploadKey,
  isGcsConfigured,
  presignPutObject,
  publicUrlForKey,
} from "@/infrastructure/storage/gcs-storage";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { requireActivePatientPortalClient } from "@/lib/auth/patient-portal-request";
import { patientPortalFilePresignBodySchema } from "@/lib/validators/patient-portal-files";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const apiT = await getApiT(request);
  if (!isGcsConfigured()) {
    return jsonError("SERVICE_UNAVAILABLE", apiT("errors.storageNotConfigured"), 503);
  }

  const portalCtx = await requireActivePatientPortalClient(apiT);
  if (!portalCtx.ok) return portalCtx.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = patientPortalFilePresignBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const { tenantId } = portalCtx.data.portal;
  const key = buildTenantUploadKey(tenantId, parsed.data.fileName);
  const uploadUrl = await presignPutObject(key, parsed.data.mimeType);

  return jsonSuccess({
    key,
    uploadUrl,
    mimeType: parsed.data.mimeType,
    publicUrl: publicUrlForKey(key),
    expiresInSeconds: 3600,
  });
}
