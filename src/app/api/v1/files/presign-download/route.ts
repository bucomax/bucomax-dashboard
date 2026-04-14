import { AuditEventType, recordAuditEvent } from "@/infrastructure/audit/record-audit-event";
import { prisma } from "@/infrastructure/database/prisma";
import { isGcsConfigured, presignGetObject } from "@/infrastructure/storage/gcs-storage";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { postFileDownloadPresignBodySchema } from "@/lib/validators/file";

export const dynamic = "force-dynamic";

const DOWNLOAD_URL_TTL_SECONDS = 300;

export async function POST(request: Request) {
  const apiT = await getApiT(request);
  if (!isGcsConfigured()) {
    return jsonError("SERVICE_UNAVAILABLE", apiT("errors.storageNotConfigured"), 503);
  }

  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const ctx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (ctx.response) return ctx.response;
  const { tenantId } = ctx;
  const forbidden = await assertActiveTenantMembership(auth.session!, tenantId, request, apiT);
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postFileDownloadPresignBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const asset = await prisma.fileAsset.findFirst({
    where: { id: parsed.data.fileId, tenantId },
    select: { id: true, r2Key: true, clientId: true },
  });
  if (!asset) {
    return jsonError("NOT_FOUND", apiT("errors.fileNotFound"), 404);
  }

  const downloadUrl = await presignGetObject(asset.r2Key, DOWNLOAD_URL_TTL_SECONDS);

  if (asset.clientId) {
    await recordAuditEvent(prisma, {
      tenantId,
      clientId: asset.clientId,
      patientPathwayId: null,
      actorUserId: auth.session!.user.id,
      type: AuditEventType.FILE_DOWNLOADED_BY_STAFF,
      payload: { fileAssetId: asset.id, userId: auth.session!.user.id },
    });
  }

  return jsonSuccess({
    downloadUrl,
    expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS,
  });
}
