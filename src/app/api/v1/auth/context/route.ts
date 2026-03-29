import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { requireSuperAdmin, requireSessionOr401 } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";
import { postAuthContextBodySchema } from "@/lib/validators/tenant";

/** Define o tenant ativo (`User.activeTenantId`). Exige membership ou `super_admin`. */
export async function POST(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postAuthContextBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const { tenantId } = parsed.data;
  const userId = auth.session!.user.id;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return jsonError("NOT_FOUND", apiT("errors.tenantNotFound"), 404);
  }

  if (!tenant.isActive) {
    return jsonError("TENANT_INACTIVE", apiT("errors.tenantInactive"), 403);
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
  });

  if (!membership && !requireSuperAdmin(auth.session!)) {
    return jsonError("FORBIDDEN", apiT("errors.forbiddenTenantAccess"), 403);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { activeTenantId: tenantId },
  });

  const fresh = await getSession();

  return jsonSuccess({
    tenantId,
    tenantRole: membership?.role ?? null,
    user: fresh?.user
      ? {
          id: fresh.user.id,
          email: fresh.user.email,
          globalRole: fresh.user.globalRole,
          tenantId: fresh.user.tenantId,
          tenantRole: fresh.user.tenantRole,
        }
      : undefined,
  });
}
