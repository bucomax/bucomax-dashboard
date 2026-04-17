import { Prisma } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { AuditEventType, recordAuditEvent } from "@/infrastructure/audit/record-audit-event";
import {
  computeSha256HexForGcsObjectKey,
  keyMatchesFileRegisterIntent,
  publicUrlForKey,
  readFirstBytesFromGcsObject,
} from "@/infrastructure/storage/gcs-storage";
import { MAGIC_BYTES_READ_SIZE, validateMagicBytes } from "@/lib/utils/magic-bytes";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { jsonIfPrismaSchemaMismatch } from "@/lib/api/prisma-schema-error";
import { findTenantClientVisibleToSession } from "@/lib/auth/client-visibility";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { postFileRegisterBodySchema } from "@/lib/validators/file";

export const dynamic = "force-dynamic";

/** Evita que leitura/hash no GCS trave a função serverless (Vercel) indefinidamente → 500/504. */
const GCS_SHA256_REGISTER_TIMEOUT_MS = 20_000;

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

  if (!keyMatchesFileRegisterIntent(parsed.data.key, tenantId, parsed.data.clientId ?? null)) {
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

  try {
    // --- Magic bytes: validar conteúdo real antes de persistir ---
    try {
      const header = await Promise.race([
        readFirstBytesFromGcsObject(parsed.data.key, MAGIC_BYTES_READ_SIZE),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), GCS_SHA256_REGISTER_TIMEOUT_MS)),
      ]);
      if (header) {
        const result = validateMagicBytes(header, parsed.data.mimeType);
        if (!result.valid) {
          return jsonError(
            "VALIDATION_ERROR",
            apiT("errors.fileMimeTypeMismatch"),
            422,
            { declaredMime: result.declaredMime },
          );
        }
      }
    } catch {
      // GCS indisponível — fail-open (não bloqueia o registro)
    }

    let sha256Hash: string | null = null;
    try {
      // Se a leitura no GCS rejeitar, o Promise.race falharia inteiro — tratar como null.
      sha256Hash = await Promise.race([
        computeSha256HexForGcsObjectKey(parsed.data.key).catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), GCS_SHA256_REGISTER_TIMEOUT_MS)),
      ]);
    } catch {
      sha256Hash = null;
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
        sha256Hash,
      },
      select: {
        id: true,
        r2Key: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        sha256Hash: true,
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
  } catch (err) {
    console.error("[POST /api/v1/files]", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return jsonError("CONFLICT", apiT("errors.fileAlreadyRegistered"), 409);
      }
      const schemaErr = jsonIfPrismaSchemaMismatch(err, apiT, "[POST /api/v1/files]");
      if (schemaErr) return schemaErr;
      if (err.code === "P2003") {
        console.error("[POST /api/v1/files] FK constraint (check uploadedById / tenantId)", err.meta);
      }
    } else if (err instanceof Error) {
      console.error("[POST /api/v1/files]", err.message);
    }
    return jsonError("INTERNAL_ERROR", apiT("errors.internalError"), 500);
  }
}
