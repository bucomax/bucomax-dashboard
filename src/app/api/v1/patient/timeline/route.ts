import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getPatientPortalSessionFromCookies } from "@/lib/auth/patient-portal-session";
import { buildClientTimelinePage } from "@/lib/clients/client-timeline";
import { mapClientTimelineForPatientPortal } from "@/lib/clients/patient-portal-timeline-map";
import { prisma } from "@/infrastructure/database/prisma";
import { clientTimelineQuerySchema } from "@/lib/validators/client-timeline-query";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const portal = await getPatientPortalSessionFromCookies();
  if (!portal) {
    return jsonError("UNAUTHORIZED", apiT("errors.patientPortalSessionRequired"), 401);
  }

  const url = new URL(request.url);
  const parsedQ = clientTimelineQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsedQ.success) {
    return jsonError("VALIDATION_ERROR", parsedQ.error.flatten().formErrors.join("; "), 422);
  }

  const { page, limit } = parsedQ.data;

  const client = await prisma.client.findFirst({
    where: {
      id: portal.clientId,
      tenantId: portal.tenantId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!client) {
    return jsonError("NOT_FOUND", apiT("errors.patientNotFound"), 404);
  }

  const raw = await buildClientTimelinePage(prisma, portal.tenantId, portal.clientId, page, limit);
  return jsonSuccess(mapClientTimelineForPatientPortal(raw));
}
