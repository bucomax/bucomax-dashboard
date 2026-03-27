import { prisma } from "@/infrastructure/database/prisma";
import { keyBelongsToTenant, publicUrlForKey } from "@/infrastructure/storage/r2-presign";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { postFileRegisterBodySchema } from "@/lib/validators/file";

export const dynamic = "force-dynamic";

/**
 * Registra metadados após upload via URL pré-assinada (`POST /files/presign`).
 */
export async function POST(request: Request) {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const ctx = getActiveTenantIdOr400(auth.session!);
  if (ctx.response) return ctx.response;
  const { tenantId } = ctx;
  const userId = auth.session!.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Corpo JSON inválido.", 400);
  }

  const parsed = postFileRegisterBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  if (!keyBelongsToTenant(parsed.data.key, tenantId)) {
    return jsonError("FORBIDDEN", "Chave de objeto inválida para este tenant.", 403);
  }

  const existingKey = await prisma.fileAsset.findUnique({
    where: { r2Key: parsed.data.key },
    select: { id: true },
  });
  if (existingKey) {
    return jsonError("CONFLICT", "Arquivo já registrado.", 409);
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
