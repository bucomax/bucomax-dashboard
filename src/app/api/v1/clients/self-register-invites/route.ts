import { buildPatientSelfRegisterUrl } from "@/infrastructure/email/resend.client";
import { getApiT } from "@/lib/api/i18n";
import { joinTranslatedZodIssues } from "@/lib/api/zod-i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { runCreatePatientSelfRegisterInvite } from "@/application/use-cases/client/create-patient-self-register-invite";
import { findTenantClientVisibleToSession } from "@/application/use-cases/shared/load-client-visibility-scope";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { postPatientSelfRegisterInviteBodySchema } from "@/lib/validators/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const ctx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (ctx.response) return ctx.response;
  const { tenantId } = ctx;
  const forbidden = await assertActiveTenantMembership(auth.session!, tenantId, request, apiT);
  if (forbidden) return forbidden;

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text) as unknown;
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postPatientSelfRegisterInviteBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      joinTranslatedZodIssues(parsed.error, apiT as (key: string) => string),
      422,
    );
  }

  let scopedClientId: string | undefined;
  if (parsed.data.clientId) {
    const client = await findTenantClientVisibleToSession(auth.session!, tenantId, parsed.data.clientId, {
      id: true,
    });
    if (!client) {
      return jsonError("NOT_FOUND", apiT("errors.patientNotFound"), 404);
    }
    scopedClientId = client.id;
  }

  const result = await runCreatePatientSelfRegisterInvite({
    tenantId,
    createdByUserId: auth.session!.user.id,
    clientId: scopedClientId ?? null,
  });

  if (!result.ok) {
    return jsonError("SERVICE_UNAVAILABLE", apiT("errors.tenantNotFound"), 503);
  }

  return jsonSuccess(
    {
      token: result.token,
      expiresAt: result.expiresAt.toISOString(),
      registerUrl: buildPatientSelfRegisterUrl(result.token, result.tenantSlug),
    },
    { status: 201 },
  );
}
