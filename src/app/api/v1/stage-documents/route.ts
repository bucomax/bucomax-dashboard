import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  assertTenantAdminOrSuper,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { postStageDocumentBodySchema } from "@/lib/validators/stage-document";

export const dynamic = "force-dynamic";

/** Vincula um `FileAsset` do tenant a uma etapa publicada (pacote da etapa). */
export async function POST(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const adminBlock = await assertTenantAdminOrSuper(auth.session!, tenantCtx.tenantId, request, apiT);
  if (adminBlock) return adminBlock;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postStageDocumentBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const stage = await prisma.pathwayStage.findFirst({
    where: {
      id: parsed.data.pathwayStageId,
      pathwayVersion: { pathway: { tenantId: tenantCtx.tenantId }, published: true },
    },
    select: { id: true },
  });
  if (!stage) {
    return jsonError("NOT_FOUND", apiT("errors.stagePublishedNotFoundInTenant"), 404);
  }

  const file = await prisma.fileAsset.findFirst({
    where: { id: parsed.data.fileAssetId, tenantId: tenantCtx.tenantId },
    select: { id: true },
  });
  if (!file) {
    return jsonError("NOT_FOUND", apiT("errors.fileNotFoundInTenant"), 404);
  }

  const existing = await prisma.stageDocument.findFirst({
    where: {
      pathwayStageId: stage.id,
      fileAssetId: file.id,
    },
    select: { id: true },
  });
  if (existing) {
    return jsonError("CONFLICT", apiT("errors.fileLinkedToStage"), 409);
  }

  const agg = await prisma.stageDocument.aggregate({
    where: { pathwayStageId: stage.id },
    _max: { sortOrder: true },
  });
  const sortOrder = (agg._max.sortOrder ?? -1) + 1;

  const created = await prisma.stageDocument.create({
    data: {
      pathwayStageId: stage.id,
      fileAssetId: file.id,
      sortOrder,
    },
    select: {
      id: true,
      sortOrder: true,
      fileAsset: { select: { id: true, fileName: true, mimeType: true } },
    },
  });

  return jsonSuccess(
    {
      stageDocument: {
        id: created.id,
        sortOrder: created.sortOrder,
        file: created.fileAsset,
      },
    },
    { status: 201 },
  );
}
