import { prisma } from "@/infrastructure/database/prisma";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { requireSessionOr401, superAdminOr403 } from "@/lib/auth/guards";
import { postAdminTenantBodySchema } from "@/lib/validators/tenant";

/** Cria tenant (apenas `super_admin`). */
export async function POST(request: Request) {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const forbidden = superAdminOr403(auth.session!);
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Corpo JSON inválido.", 400);
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
      return jsonError("CONFLICT", "Já existe um tenant com este slug.", 409);
    }
    throw e;
  }
}
