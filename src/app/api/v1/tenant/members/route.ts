import { getApiT } from "@/lib/api/i18n";
import { jsonSuccess } from "@/lib/api-response";
import { listTenantMembersForPicker } from "@/application/use-cases/tenant/list-tenant-members-for-picker";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

/** Lista membros do tenant ativo (picker de responsável, etc.). */
export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const forbidden = await assertActiveTenantMembership(auth.session!, tenantCtx.tenantId, request, apiT);
  if (forbidden) return forbidden;

  const members = await listTenantMembersForPicker({ tenantId: tenantCtx.tenantId });

  return jsonSuccess({ members });
}
