import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { runDeleteClientFileAsset } from "@/application/use-cases/client/delete-client-file-asset";
import { findTenantClientVisibleToSession } from "@/application/use-cases/shared/load-client-visibility-scope";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import type { RouteCtx } from "@/types/api/route-context";

export const dynamic = "force-dynamic";

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

  const result = await runDeleteClientFileAsset({
    tenantId,
    clientId,
    fileId,
    actorUserId: auth.session!.user.id,
  });

  if (!result.ok) {
    if (result.code === "FILE_NOT_FOUND") {
      return jsonError("NOT_FOUND", apiT("errors.clientFileNotFound"), 404);
    }
    return jsonError("SERVICE_UNAVAILABLE", apiT("errors.fileStorageDeleteFailed"), 503);
  }

  return jsonSuccess({ message: apiT("success.clientFileDeleted") });
}
