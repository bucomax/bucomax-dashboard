import { prisma } from "@/infrastructure/database/prisma";
import {
  encryptTenantSecret,
} from "@/infrastructure/crypto/tenant-secret";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  assertTenantAdminOrSuper,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { patchWhatsAppSettingsBodySchema } from "@/lib/validators/tenant-whatsapp";

export const dynamic = "force-dynamic";

const WHATSAPP_SELECT = {
  whatsappEnabled: true,
  whatsappPhoneNumberId: true,
  whatsappBusinessAccountId: true,
  whatsappAccessTokenEnc: true,
  whatsappWebhookVerifyToken: true,
  whatsappVerifiedAt: true,
} as const;

function toDto(tenant: {
  whatsappEnabled: boolean;
  whatsappPhoneNumberId: string | null;
  whatsappBusinessAccountId: string | null;
  whatsappAccessTokenEnc: string | null;
  whatsappWebhookVerifyToken: string | null;
  whatsappVerifiedAt: Date | null;
}) {
  return {
    whatsappEnabled: tenant.whatsappEnabled,
    whatsappPhoneNumberId: tenant.whatsappPhoneNumberId,
    whatsappBusinessAccountId: tenant.whatsappBusinessAccountId,
    hasAccessToken: Boolean(tenant.whatsappAccessTokenEnc),
    whatsappWebhookVerifyToken: tenant.whatsappWebhookVerifyToken,
    whatsappVerifiedAt: tenant.whatsappVerifiedAt?.toISOString() ?? null,
  };
}

export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const adminBlock = await assertTenantAdminOrSuper(auth.session!, tenantCtx.tenantId, request, apiT);
  if (adminBlock) return adminBlock;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantCtx.tenantId },
    select: WHATSAPP_SELECT,
  });

  if (!tenant) {
    return jsonError("NOT_FOUND", apiT("errors.tenantNotFound"), 404);
  }

  return jsonSuccess({ whatsapp: toDto(tenant) });
}

export async function PATCH(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const adminBlock = await assertTenantAdminOrSuper(auth.session!, tenantCtx.tenantId, request, apiT);
  if (adminBlock) return adminBlock;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = patchWhatsAppSettingsBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const { whatsappAccessToken, ...rest } = parsed.data;

  // Build update data — encrypt token if provided
  const updateData: Record<string, unknown> = { ...rest };

  if (whatsappAccessToken !== undefined) {
    if (whatsappAccessToken === null) {
      updateData.whatsappAccessTokenEnc = null;
    } else {
      updateData.whatsappAccessTokenEnc = encryptTenantSecret(whatsappAccessToken);
    }
    // Reset verification when token changes
    updateData.whatsappVerifiedAt = null;
  }

  const tenant = await prisma.tenant.update({
    where: { id: tenantCtx.tenantId },
    data: updateData,
    select: WHATSAPP_SELECT,
  });

  return jsonSuccess({ whatsapp: toDto(tenant) });
}
