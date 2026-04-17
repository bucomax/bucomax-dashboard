import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { assertTenantAdminOrSuper, requireSessionOr401 } from "@/lib/auth/guards";
import {
  listTenantMembersWithProfiles,
  tenantExistsById,
} from "@/application/use-cases/admin/list-tenant-members-with-profiles";
import type { RouteCtx } from "@/types/api/route-context";

export const dynamic = "force-dynamic";

/** Lista membros ativos do tenant (usuário não deletado). */
export async function GET(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const { tenantId } = await ctx.params;

  if (!(await tenantExistsById(tenantId))) {
    return jsonError("NOT_FOUND", apiT("errors.tenantNotFound"), 404);
  }

  const forbidden = await assertTenantAdminOrSuper(auth.session!, tenantId, request, apiT);
  if (forbidden) return forbidden;

  const members = await listTenantMembersWithProfiles({ tenantId });

  return jsonSuccess({ members });
}
