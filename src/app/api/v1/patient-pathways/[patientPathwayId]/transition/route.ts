import { getApiT } from "@/lib/api/i18n";
import { joinTranslatedZodIssues } from "@/lib/api/zod-i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import {
  postStageTransitionBodySchema,
  runTransitionPatientStage,
} from "@/application/use-cases/pathway/transition-patient-stage";

export const dynamic = "force-dynamic";

import type { RouteCtx } from "@/types/api/route-context";

export async function POST(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;
  const forbidden = await assertActiveTenantMembership(auth.session!, tenantCtx.tenantId, request, apiT);
  if (forbidden) return forbidden;

  const { patientPathwayId } = await ctx.params;
  const actorUserId = auth.session!.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postStageTransitionBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      joinTranslatedZodIssues(parsed.error, apiT as (key: string) => string),
      422,
    );
  }

  const outcome = await runTransitionPatientStage({
    tenantId: tenantCtx.tenantId,
    actorUserId,
    patientPathwayId,
    input: parsed.data,
  });

  if (!outcome.ok) {
    if (outcome.code === "CHECKLIST_BLOCKED") {
      return jsonError(
        "CHECKLIST_REQUIRED_INCOMPLETE",
        apiT("errors.checklistRequiredIncomplete"),
        422,
        { pendingItems: outcome.pendingItems },
      );
    }
    switch (outcome.code) {
      case "PATIENT_PATHWAY_NOT_FOUND":
        return jsonError("NOT_FOUND", apiT("errors.patientPathwayInstanceNotFound"), 404);
      case "PATHWAY_ALREADY_COMPLETED":
        return jsonError("CONFLICT", apiT("errors.pathwayAlreadyCompleted"), 409);
      case "TARGET_STAGE_NOT_FOUND":
        return jsonError("NOT_FOUND", apiT("errors.invalidStageForVersion"), 404);
      case "ALREADY_IN_TARGET_STAGE":
        return jsonError("VALIDATION_ERROR", apiT("errors.patientAlreadyInStage"), 422);
      case "LOCK_CONFLICT":
        return jsonError("CONFLICT", "Transition already in progress.", 409);
      case "INTERNAL_AFTER_TX":
        return jsonError("INTERNAL", apiT("errors.dbUnavailable"), 500);
    }
  }

  return jsonSuccess(outcome.data);
}
