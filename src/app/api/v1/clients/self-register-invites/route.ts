import { randomBytes } from "crypto";
import { prisma } from "@/infrastructure/database/prisma";
import { buildPatientSelfRegisterUrl } from "@/infrastructure/email/resend.client";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

const INVITE_TTL_MS = 48 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const ctx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (ctx.response) return ctx.response;
  const { tenantId } = ctx;
  const forbidden = await assertActiveTenantMembership(auth.session!, tenantId, request, apiT);
  if (forbidden) return forbidden;

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await prisma.patientSelfRegisterInvite.create({
    data: {
      tenantId,
      token,
      expiresAt,
      createdByUserId: auth.session!.user.id,
    },
  });

  return jsonSuccess(
    {
      token,
      expiresAt: expiresAt.toISOString(),
      registerUrl: buildPatientSelfRegisterUrl(token),
    },
    { status: 201 },
  );
}
