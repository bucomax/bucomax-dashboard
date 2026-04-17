import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { requireSessionOr401, superAdminOr403 } from "@/lib/auth/guards";
import { postAdminTenantBodySchema } from "@/lib/validators/tenant";
import { listAllTenantsForSuperAdmin } from "@/application/use-cases/admin/list-tenants";
import { runCreateTenant } from "@/application/use-cases/admin/create-tenant";

export const dynamic = "force-dynamic";

/** Lista todos os tenants com flags de gestão (apenas `super_admin`). */
export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const forbidden = await superAdminOr403(auth.session!, request, apiT);
  if (forbidden) return forbidden;

  const rows = await listAllTenantsForSuperAdmin();

  return jsonSuccess({ tenants: rows });
}

/** Cria tenant (apenas `super_admin`). */
export async function POST(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const forbidden = await superAdminOr403(auth.session!, request, apiT);
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postAdminTenantBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const result = await runCreateTenant({
    name: parsed.data.name,
    slug: parsed.data.slug,
  });

  if (!result.ok) {
    return jsonError("CONFLICT", apiT("errors.tenantSlugConflict"), 409);
  }

  return jsonSuccess({ tenant: result.tenant }, { status: 201 });
}
