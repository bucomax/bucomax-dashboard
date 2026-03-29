import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { requireSessionOr401, superAdminOr403 } from "@/lib/auth/guards";
import { postAdminTenantBodySchema } from "@/lib/validators/tenant";

/** Lista todos os tenants com flags de gestão (apenas `super_admin`). */
export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const forbidden = await superAdminOr403(auth.session!, request, apiT);
  if (forbidden) return forbidden;

  const rows = await prisma.tenant.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, isActive: true },
  });

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

  const { name, slug } = parsed.data;

  try {
    const tenant = await prisma.tenant.create({
      data: { name: name.trim(), slug },
    });
    return jsonSuccess({ tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug } }, { status: 201 });
  } catch (e: unknown) {
    const isUnique =
      typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
    if (isUnique) {
      return jsonError("CONFLICT", apiT("errors.tenantSlugConflict"), 409);
    }
    throw e;
  }
}
