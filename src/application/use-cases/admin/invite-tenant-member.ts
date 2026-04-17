import { randomBytes } from "crypto";
import { z } from "zod";

import type { TenantMembershipRole } from "@/application/ports/user-repository.port";
import { getInviteSetPasswordHtml } from "@/infrastructure/email/email-templates";
import { isEmailConfigured, sendEmail, buildInviteSetPasswordUrl } from "@/infrastructure/email/resend.client";
import { tenantPrismaRepository } from "@/infrastructure/repositories/tenant.repository";
import { userPrismaRepository } from "@/infrastructure/repositories/user.repository";
import { normalizeEmail } from "@/lib/utils/email";
import { adminInviteSchema } from "@/lib/validators/auth";

export type InviteTenantMemberInput = z.infer<typeof adminInviteSchema>;

export { adminInviteSchema };

export type InviteTenantMemberErrorCode =
  | "EMAIL_NOT_CONFIGURED"
  | "TENANT_NOT_FOUND"
  | "EMAIL_DISABLED_ACCOUNT"
  | "USER_ALREADY_MEMBER"
  | "EMAIL_SEND_FAILED";

export type InviteTenantMemberSuccess =
  | {
      kind: "readded";
      email: string;
      emailDispatched: false;
    }
  | {
      kind: "invite";
      email: string;
      emailDispatched: boolean;
    };

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

/**
 * Convida usuário ao tenant: cria conta sem senha e envia link para definir senha (Resend).
 */
export async function runInviteTenantMember(input: InviteTenantMemberInput): Promise<
  { ok: true; data: InviteTenantMemberSuccess } | { ok: false; code: InviteTenantMemberErrorCode }
> {
  if (!isEmailConfigured()) {
    return { ok: false, code: "EMAIL_NOT_CONFIGURED" };
  }

  const { email, name, tenantId, role } = input;
  const emailNorm = normalizeEmail(email);
  const rolePort: TenantMembershipRole = role;

  const tenantExists = await tenantPrismaRepository.tenantExistsById(tenantId);
  if (!tenantExists) {
    return { ok: false, code: "TENANT_NOT_FOUND" };
  }

  const existing = await userPrismaRepository.findUserForTenantInvite(emailNorm, tenantId);

  if (existing) {
    if (existing.deletedAt) {
      return { ok: false, code: "EMAIL_DISABLED_ACCOUNT" };
    }
    if (existing.hasMembershipInTenant) {
      return { ok: false, code: "USER_ALREADY_MEMBER" };
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const needsInviteEmail = existing.passwordHash === null;
    const trimmedName = name?.trim();

    await userPrismaRepository.inviteExistingUserToTenant({
      userId: existing.id,
      tenantId,
      role: rolePort,
      nameTrimmed: trimmedName || undefined,
      token,
      expiresAt,
      needsInviteEmail,
    });

    if (!needsInviteEmail) {
      return {
        ok: true,
        data: {
          kind: "readded",
          email: emailNorm,
          emailDispatched: false,
        },
      };
    }

    const { error } = await sendInviteSetPasswordEmail(emailNorm, name, token);
    if (error) {
      console.error("Erro ao enviar convite:", error);
      return { ok: false, code: "EMAIL_SEND_FAILED" };
    }

    return {
      ok: true,
      data: {
        kind: "invite",
        email: emailNorm,
        emailDispatched: true,
      },
    };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await userPrismaRepository.inviteNewUserToTenant({
    emailNorm,
    name: name?.trim() || null,
    tenantId,
    role: rolePort,
    token,
    expiresAt,
  });

  const { error } = await sendInviteSetPasswordEmail(emailNorm, name, token);
  if (error) {
    console.error("Erro ao enviar convite:", error);
    return { ok: false, code: "EMAIL_SEND_FAILED" };
  }

  return {
    ok: true,
    data: {
      kind: "invite",
      email: emailNorm,
      emailDispatched: true,
    },
  };
}
