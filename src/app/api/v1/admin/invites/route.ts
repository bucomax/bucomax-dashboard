import { randomBytes } from "crypto";
import { AuthTokenPurpose, GlobalRole } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { getInviteSetPasswordHtml } from "@/infrastructure/email/email-templates";
import { isEmailConfigured, sendEmail, buildInviteSetPasswordUrl } from "@/infrastructure/email/resend.client";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { assertTenantInvitePermission, requireSessionOr401 } from "@/lib/auth/guards";
import { normalizeEmail } from "@/lib/utils/email";
import { adminInviteSchema } from "@/lib/validators/auth";

export const dynamic = "force-dynamic";

async function sendInviteSetPasswordEmail(
  emailNorm: string,
  name: string | null | undefined,
  token: string,
): Promise<{ error?: Error }> {
  const setPasswordUrl = buildInviteSetPasswordUrl(token);
  return sendEmail({
    to: emailNorm,
    subject: "Bucomax — Defina sua senha",
    html: getInviteSetPasswordHtml({
      name: name?.trim() || null,
      setPasswordUrl,
    }),
  });
}

/** Convida usuário ao tenant: cria conta sem senha e envia link para definir senha (Resend). */
export async function POST(request: Request) {
  const apiT = await getApiT(request);
  if (!isEmailConfigured()) {
    return jsonError("SERVICE_UNAVAILABLE", apiT("errors.invitesNotConfigured"), 503);
  }

  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = adminInviteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const { email, name, tenantId, role } = parsed.data;
  const emailNorm = normalizeEmail(email);

  const perm = await assertTenantInvitePermission(auth.session!, tenantId, request, apiT);
  if (perm) return perm;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return jsonError("NOT_FOUND", apiT("errors.tenantNotFound"), 404);
  }

  const existing = await prisma.user.findFirst({
    where: { email: emailNorm },
    select: {
      id: true,
      deletedAt: true,
      passwordHash: true,
      memberships: { where: { tenantId }, select: { id: true } },
    },
  });

  if (existing) {
    if (existing.deletedAt) {
      return jsonError("CONFLICT", apiT("errors.emailDisabledAccount"), 409);
    }
    if (existing.memberships.length > 0) {
      return jsonError("CONFLICT", apiT("errors.userAlreadyMember"), 409);
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const needsInviteEmail = existing.passwordHash === null;

    await prisma.$transaction(async (tx) => {
      const trimmedName = name?.trim();
      if (trimmedName) {
        await tx.user.update({
          where: { id: existing.id },
          data: { name: trimmedName },
        });
      }

      await tx.tenantMembership.create({
        data: {
          userId: existing.id,
          tenantId,
          role,
        },
      });

      await tx.userAuthToken.deleteMany({
        where: {
          userId: existing.id,
          tenantId,
          purpose: AuthTokenPurpose.INVITE_SET_PASSWORD,
          usedAt: null,
        },
      });

      if (needsInviteEmail) {
        await tx.userAuthToken.create({
          data: {
            token,
            userId: existing.id,
            tenantId,
            purpose: AuthTokenPurpose.INVITE_SET_PASSWORD,
            expiresAt,
          },
        });
      }
    });

    if (!needsInviteEmail) {
      return jsonSuccess(
        {
          message: apiT("success.memberReadded"),
          email: emailNorm,
          emailDispatched: false,
        },
        { status: 201 },
      );
    }

    const { error } = await sendInviteSetPasswordEmail(emailNorm, name, token);
    if (error) {
      console.error("Erro ao enviar convite:", error);
      return jsonError("EMAIL_SEND_FAILED", apiT("errors.emailSendFailedAfterUser"), 500);
    }

    return jsonSuccess(
      {
        message: apiT("success.inviteSent"),
        email: emailNorm,
        emailDispatched: true,
      },
      { status: 201 },
    );
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: emailNorm,
        name: name?.trim() || null,
        passwordHash: null,
        globalRole: GlobalRole.user,
      },
    });

    await tx.tenantMembership.create({
      data: {
        userId: user.id,
        tenantId,
        role,
      },
    });

    await tx.userAuthToken.create({
      data: {
        token,
        userId: user.id,
        tenantId,
        purpose: AuthTokenPurpose.INVITE_SET_PASSWORD,
        expiresAt,
      },
    });
  });

  const { error } = await sendInviteSetPasswordEmail(emailNorm, name, token);
  if (error) {
    console.error("Erro ao enviar convite:", error);
    return jsonError("EMAIL_SEND_FAILED", apiT("errors.emailSendFailedAfterUser"), 500);
  }

  return jsonSuccess(
    {
      message: apiT("success.inviteSent"),
      email: emailNorm,
      emailDispatched: true,
    },
    { status: 201 },
  );
}
