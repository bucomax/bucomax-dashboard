import { prisma } from "@/infrastructure/database/prisma";
import {
  buildTenantUploadKey,
  isR2Configured,
  presignPutObject,
  publicUrlForKey,
} from "@/infrastructure/storage/r2-presign";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { postFilePresignBodySchema } from "@/lib/validators/file";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isR2Configured()) {
    return jsonError(
      "SERVICE_UNAVAILABLE",
      "Armazenamento R2 não configurado. Defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.",
      503,
    );
  }

  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const ctx = getActiveTenantIdOr400(auth.session!);
  if (ctx.response) return ctx.response;
  const { tenantId } = ctx;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Corpo JSON inválido.", 400);
  }

  const parsed = postFilePresignBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  if (parsed.data.clientId) {
    const c = await prisma.client.findFirst({
      where: { id: parsed.data.clientId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!c) {
      return jsonError("NOT_FOUND", "Paciente não encontrado neste tenant.", 404);
    }
  }

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
