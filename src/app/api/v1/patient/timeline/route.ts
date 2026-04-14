import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { requireActivePatientPortalClient } from "@/lib/auth/patient-portal-request";
import { buildClientTimelinePage } from "@/lib/clients/client-timeline";
import { mapClientTimelineForPatientPortal } from "@/lib/clients/patient-portal-timeline-map";
import { prisma } from "@/infrastructure/database/prisma";
import { clientTimelineQuerySchema } from "@/lib/validators/client-timeline-query";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const portalCtx = await requireActivePatientPortalClient(request, apiT);
  if (!portalCtx.ok) return portalCtx.response;
  const portal = portalCtx.data.portal;

  const url = new URL(request.url);
  const parsedQ = clientTimelineQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    categories: url.searchParams.get("categories") ?? undefined,
  });
  if (!parsedQ.success) {
    return jsonError("VALIDATION_ERROR", parsedQ.error.flatten().formErrors.join("; "), 422);
  }

  const { page, limit, categories } = parsedQ.data;

  const categoryFilter =
    categories != null && categories.length > 0 ? new Set(categories) : null;

  const raw = await buildClientTimelinePage(prisma, portal.tenantId, portal.clientId, page, limit, {
    categoryFilter,
  });
  return jsonSuccess(mapClientTimelineForPatientPortal(raw));
}
