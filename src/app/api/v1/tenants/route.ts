import { listTenantsForUserContext } from "@/infrastructure/database/tenant-context";
import { getApiT } from "@/lib/api/i18n";
import { jsonSuccess } from "@/lib/api-response";
import { requireSessionOr401 } from "@/lib/auth/guards";

/** Lista tenants do contexto do usuário (super_admin vê todos). */
export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenants = await listTenantsForUserContext({
    userId: auth.session!.user.id,
    isSuperAdmin: auth.session!.user.globalRole === "super_admin",
  });

  return jsonSuccess({
    tenants,
  });
}
