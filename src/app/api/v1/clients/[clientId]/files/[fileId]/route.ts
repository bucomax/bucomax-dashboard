import { prisma } from "@/infrastructure/database/prisma";
import {
  deleteObjectFromBucket,
  isGcsConfigured,
  keyBelongsToTenant,
} from "@/infrastructure/storage/gcs-storage";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { findTenantClientVisibleToSession } from "@/lib/auth/client-visibility";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ clientId: string; fileId: string }> };

export async function DELETE(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;
  const forbidden = await assertActiveTenantMembership(auth.session!, tenantCtx.tenantId, request, apiT);
  if (forbidden) return forbidden;

  const { clientId, fileId } = await ctx.params;
  const { tenantId } = tenantCtx;

  const client = await findTenantClientVisibleToSession(auth.session!, tenantId, clientId, {
    id: true,
  });
  if (!client) {
    return jsonError("NOT_FOUND", apiT("errors.patientNotFound"), 404);
  }

  const asset = await prisma.fileAsset.findFirst({
    where: { id: fileId, clientId, tenantId },
    select: { id: true, r2Key: true },
  });
  if (!asset) {
    return jsonError("NOT_FOUND", apiT("errors.clientFileNotFound"), 404);
  }

  if (isGcsConfigured() && keyBelongsToTenant(asset.r2Key, tenantId)) {
    try {
      await deleteObjectFromBucket(asset.r2Key);
    } catch {
      return jsonError("SERVICE_UNAVAILABLE", apiT("errors.fileStorageDeleteFailed"), 503);
    }
  }

  await prisma.fileAsset.delete({ where: { id: asset.id } });

  return jsonSuccess({ message: apiT("success.clientFileDeleted") });
}
