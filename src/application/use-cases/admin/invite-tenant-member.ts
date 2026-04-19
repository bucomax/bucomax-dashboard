import { randomBytes } from "crypto";
import { z } from "zod";

import type { TenantMembershipRole } from "@/application/ports/user-repository.port";
import { getInviteSetPasswordHtml } from "@/infrastructure/email/email-templates";
import { isEmailConfigured, sendEmail, buildInviteSetPasswordUrl } from "@/infrastructure/email/resend.client";
import { tenantPrismaRepository } from "@/infrastructure/repositories/tenant.repository";
import { userPrismaRepository } from "@/infrastructure/repositories/user.repository";
import { normalizeEmail } from "@/lib/utils/email";
import { formatTaxDocumentDisplay } from "@/lib/validators/tax-document";
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

function buildInviteEmailSubject(clinicName: string): string {
  const name = clinicName.trim();
  if (!name) {
    return "Bucomax — Defina sua senha";
  }
  const max = 88;
  const shortened = name.length > max ? `${name.slice(0, max - 1)}…` : name;
  return `Bucomax — ${shortened} — Defina sua senha`;
}

async function sendInviteSetPasswordEmail(
  emailNorm: string,
  name: string | null | undefined,
  token: string,
  tenant: { name: string; taxId: string | null },
): Promise<{ error?: Error }> {
  const setPasswordUrl = buildInviteSetPasswordUrl(token);
  const taxRaw = tenant.taxId?.trim();
  const tenantTaxIdDisplay = taxRaw ? formatTaxDocumentDisplay(taxRaw) : null;
  return sendEmail({
    to: emailNorm,
    subject: buildInviteEmailSubject(tenant.name),
    html: getInviteSetPasswordHtml({
      name: name?.trim() || null,
      setPasswordUrl,
      tenantName: tenant.name.trim(),
      tenantTaxIdDisplay,
    }),
  });
}

/**
 * Convida usuário ao tenant: cria conta sem senha e envia link para definir senha (Resend).
 */
export async function runInviteTenantMember(input: InviteTenantMemberInput): Promise<
  { ok: true; data: InviteTenantMemberSuccess } | { ok: false; code: InviteTenantMemberErrorCode }
> {
  const { email, name, tenantId, role } = input;
  const emailNorm = normalizeEmail(email);
  const rolePort: TenantMembershipRole = role;

  const tenant = await tenantPrismaRepository.findById(tenantId);
  if (!tenant) {
    return { ok: false, code: "TENANT_NOT_FOUND" };
  }
  const tenantForEmail = { name: tenant.name, taxId: tenant.taxId };

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
    if (needsInviteEmail && !isEmailConfigured()) {
      return { ok: false, code: "EMAIL_NOT_CONFIGURED" };
    }
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

    const { error } = await sendInviteSetPasswordEmail(emailNorm, name, token, tenantForEmail);
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

  if (!isEmailConfigured()) {
    return { ok: false, code: "EMAIL_NOT_CONFIGURED" };
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

  const { error } = await sendInviteSetPasswordEmail(emailNorm, name, token, tenantForEmail);
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
