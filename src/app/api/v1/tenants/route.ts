import { listTenantsForUserContext } from "@/infrastructure/database/tenant-context";
import { jsonSuccess } from "@/lib/api-response";
import { requireSessionOr401 } from "@/lib/auth/guards";

/** Lista tenants do contexto do usuário (super_admin vê todos). */
export async function GET() {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const tenants = await listTenantsForUserContext({
    userId: auth.session!.user.id,
    isSuperAdmin: auth.session!.user.globalRole === "super_admin",
  });

  return jsonSuccess({
    tenants,
  });
}
