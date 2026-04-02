import { prisma } from "@/infrastructure/database/prisma";
import { AuditEventType, recordAuditEvent } from "@/infrastructure/audit/record-audit-event";
import { keyBelongsToTenant, publicUrlForKey } from "@/infrastructure/storage/gcs-storage";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { findTenantClientVisibleToSession } from "@/lib/auth/client-visibility";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { postFileRegisterBodySchema } from "@/lib/validators/file";

export const dynamic = "force-dynamic";

/**
 * Registra metadados após upload via URL pré-assinada (`POST /files/presign`).
 */
export async function POST(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const ctx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (ctx.response) return ctx.response;
  const { tenantId } = ctx;
  const forbidden = await assertActiveTenantMembership(auth.session!, tenantId, request, apiT);
  if (forbidden) return forbidden;
  const userId = auth.session!.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postFileRegisterBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  if (!keyBelongsToTenant(parsed.data.key, tenantId)) {
    return jsonError("FORBIDDEN", apiT("errors.invalidObjectKey"), 403);
  }

  const existingKey = await prisma.fileAsset.findUnique({
    where: { r2Key: parsed.data.key },
    select: { id: true },
  });
  if (existingKey) {
    return jsonError("CONFLICT", apiT("errors.fileAlreadyRegistered"), 409);
  }

  if (parsed.data.clientId) {
    const c = await findTenantClientVisibleToSession(auth.session!, tenantId, parsed.data.clientId, {
      id: true,
    });
    if (!c) {
      return jsonError("NOT_FOUND", apiT("errors.patientNotFoundInTenant"), 404);
    }
  }

  const asset = await prisma.fileAsset.create({
    data: {
      tenantId,
      r2Key: parsed.data.key,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      uploadedById: userId,
      clientId: parsed.data.clientId ?? null,
    },
    select: {
      id: true,
      r2Key: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      clientId: true,
      createdAt: true,
    },
  });

  if (asset.clientId) {
    await recordAuditEvent(prisma, {
      tenantId,
      clientId: asset.clientId,
      patientPathwayId: null,
      actorUserId: userId,
      type: AuditEventType.FILE_UPLOADED_TO_CLIENT,
      payload: { fileAssetId: asset.id, mimeType: asset.mimeType },
    });
  }

  return jsonSuccess(
    {
      file: {
        ...asset,
        publicUrl: publicUrlForKey(asset.r2Key),
        createdAt: asset.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
