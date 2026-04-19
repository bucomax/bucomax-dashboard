import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { generateAppScopedToken } from "@/lib/auth/app-scoped-token";
import { appPrismaRepository } from "@/infrastructure/repositories/app.repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ appId: string }> };

/**
 * POST /api/v1/tenant/apps/:appId/token
 *
 * Generate a short-lived, scoped JWT for an iframe app.
 * The token contains: userId, tenantId, appId, appSlug.
 * Validity: 15 minutes.
 *
 * Requires: authenticated user with active membership in tenant + app active for tenant.
 */
export async function POST(request: Request, context: RouteContext) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const memberErr = await assertActiveTenantMembership(
    auth.session!,
    tenantCtx.tenantId!,
    request,
    apiT,
  );
  if (memberErr) return memberErr;

  const { appId } = await context.params;

  // Resolve app by ID or slug
  const app = await appPrismaRepository.findByIdOrSlug(appId);
  if (!app) {
    return jsonError("NOT_FOUND", "App não encontrado.", 404);
  }

  // Verify app is active for this tenant
  const tenantApp = await appPrismaRepository.findTenantApp(tenantCtx.tenantId!, app.id);
  if (!tenantApp || tenantApp.status !== "active") {
    return jsonError("NOT_FOUND", "App não ativo neste tenant.", 404);
  }

  const token = await generateAppScopedToken({
    userId: auth.session!.user.id,
    tenantId: tenantCtx.tenantId!,
    appId: app.id,
    appSlug: app.slug,
  });

  return jsonSuccess({ token, expiresIn: 900 });
}
