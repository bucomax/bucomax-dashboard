import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  assertTenantAdminOrSuper,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { verifyTenantEmailDomain } from "@/application/use-cases/tenant/tenant-email-domain";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const adminBlock = await assertTenantAdminOrSuper(auth.session!, tenantCtx.tenantId, request, apiT);
  if (adminBlock) return adminBlock;

  const result = await verifyTenantEmailDomain({ tenantId: tenantCtx.tenantId });
  if (!result.ok) {
    if (result.code === "RESEND_NOT_CONFIGURED") {
      return jsonError("SERVICE_UNAVAILABLE", apiT("errors.emailResendNotConfigured"), 503);
    }
    if (result.code === "NO_DOMAIN") {
      return jsonError("PRECONDITION_FAILED", apiT("errors.emailDomainNotConfigured"), 412);
    }
    if (result.code === "RESEND_ERROR") {
      return jsonError("BAD_GATEWAY", result.errorMessage ?? "Falha na verificação no Resend.", 502);
    }
    return jsonError("NOT_FOUND", apiT("errors.tenantNotFound"), 404);
  }
  return jsonSuccess({ emailDomain: result.dto });
}
