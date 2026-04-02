import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getPatientPortalSessionFromCookies } from "@/lib/auth/patient-portal-session";
import { prisma } from "@/infrastructure/database/prisma";
import type { PatientPortalOverviewResponse } from "@/types/api/patient-portal-v1";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const portal = await getPatientPortalSessionFromCookies();
  if (!portal) {
    return jsonError("UNAUTHORIZED", apiT("errors.patientPortalSessionRequired"), 401);
  }

  const client = await prisma.client.findFirst({
    where: {
      id: portal.clientId,
      tenantId: portal.tenantId,
      deletedAt: null,
    },
    select: { name: true, email: true },
  });
  if (!client) {
    return jsonError("NOT_FOUND", apiT("errors.patientNotFound"), 404);
  }

  const [tenant, activePp] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: portal.tenantId },
      select: { name: true },
    }),
    prisma.patientPathway.findFirst({
      where: {
        clientId: portal.clientId,
        tenantId: portal.tenantId,
        completedAt: null,
      },
      select: {
        id: true,
        enteredStageAt: true,
        pathway: { select: { name: true } },
        currentStage: { select: { name: true } },
      },
    }),
  ]);

  const data: PatientPortalOverviewResponse = {
    client: { name: client.name, email: client.email },
    tenant: { name: tenant?.name ?? "—" },
    activeJourney: activePp
      ? {
          patientPathwayId: activePp.id,
          pathwayName: activePp.pathway.name,
          currentStageName: activePp.currentStage.name,
          enteredStageAt: activePp.enteredStageAt.toISOString(),
        }
      : null,
  };

  return jsonSuccess(data);
}
