import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { jsonSuccess } from "@/lib/api-response";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const count = await prisma.notification.count({
    where: {
      userId: auth.session!.user.id,
      tenantId: tenantCtx.tenantId,
      readAt: null,
    },
  });

  return jsonSuccess({ count });
}
