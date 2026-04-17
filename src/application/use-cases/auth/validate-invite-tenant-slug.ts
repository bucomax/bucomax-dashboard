import { PUBLIC_INVITE_TENANT_SLUG_HEADER } from "@/lib/constants/public-invite";
import { findActiveTenantBySlug } from "./resolve-public-tenant";

/**
 * Link legado sem slug na URL: header ausente → válido.
 * Link novo: header com slug → precisa ser o tenant do convite.
 */
export async function validatePublicInviteTenantSlug(
  request: Request,
  inviteTenantId: string,
): Promise<boolean> {
  const raw = request.headers.get(PUBLIC_INVITE_TENANT_SLUG_HEADER)?.trim() ?? "";
  if (!raw) {
    return true;
  }
  const tenant = await findActiveTenantBySlug(raw);
  return Boolean(tenant && tenant.id === inviteTenantId);
}
