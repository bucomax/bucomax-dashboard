import { randomBytes } from "crypto";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { findTenantClientVisibleToSession } from "@/lib/auth/client-visibility";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { getPublicAppUrl } from "@/lib/config/urls";
import { PATIENT_PORTAL_LINK_TTL_MS } from "@/lib/constants/patient-portal";
import { prisma } from "@/infrastructure/database/prisma";
import { getPatientPortalMagicLinkHtml } from "@/infrastructure/email/email-templates";
import { isEmailConfigured, sendEmail } from "@/infrastructure/email/resend.client";
import { postClientPortalLinkBodySchema } from "@/lib/validators/patient-portal";
import type { PostClientPortalLinkResponse } from "@/types/api/patient-portal-v1";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ clientId: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;
  const { tenantId } = tenantCtx;

  const forbidden = await assertActiveTenantMembership(auth.session!, tenantId, request, apiT);
  if (forbidden) return forbidden;

  const { clientId } = await ctx.params;

  const client = await findTenantClientVisibleToSession(auth.session!, tenantId, clientId, {
    id: true,
    name: true,
    email: true,
  });
  if (!client) {
    return jsonError("NOT_FOUND", apiT("errors.patientNotFound"), 404);
  }

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text) as unknown;
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postClientPortalLinkBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const sendEmailFlag = parsed.data.sendEmail !== false;
  const email = client.email?.trim() ?? "";

  if (sendEmailFlag && !email) {
    return jsonError("VALIDATION_ERROR", apiT("errors.patientPortalEmailRequired"), 422);
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + PATIENT_PORTAL_LINK_TTL_MS);

  const singleUse = sendEmailFlag;

  await prisma.patientPortalLinkToken.create({
    data: {
      clientId: client.id,
      token,
      expiresAt,
      singleUse,
    },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, slug: true },
  });
  const clinicName = tenant?.name ?? "Clínica";
  const tenantSlug = tenant?.slug ?? "";
  if (!tenantSlug) {
    return jsonError("SERVICE_UNAVAILABLE", apiT("errors.tenantNotFound"), 503);
  }

  const enterUrl = `${getPublicAppUrl()}/${tenantSlug}/patient/enter?token=${encodeURIComponent(token)}`;

  let emailSent = false;
  if (sendEmailFlag && email) {
    if (!isEmailConfigured()) {
      return jsonError("SERVICE_UNAVAILABLE", apiT("errors.invitesNotConfigured"), 503);
    }

    const { error } = await sendEmail({
      to: email,
      subject: `${clinicName} — Acesso ao seu acompanhamento (Bucomax)`,
      html: getPatientPortalMagicLinkHtml({
        patientName: client.name,
        clinicName,
        enterUrl,
        singleUse,
      }),
      text: `Olá, ${client.name}. Acesse seu acompanhamento: ${enterUrl}`,
    });
    if (error) {
      return jsonError("SERVICE_UNAVAILABLE", apiT("errors.emailSendFailedGeneric"), 503);
    }
    emailSent = true;
  }

  const data: PostClientPortalLinkResponse = {
    enterUrl,
    emailSent,
    expiresAt: expiresAt.toISOString(),
  };

  return jsonSuccess(data, { status: 201 });
}
