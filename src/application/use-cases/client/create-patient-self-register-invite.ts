import { randomBytes } from "crypto";
import { patientSelfRegisterInvitePrismaRepository } from "@/infrastructure/repositories/patient-self-register-invite.repository";
import { tenantPrismaRepository } from "@/infrastructure/repositories/tenant.repository";

const INVITE_TTL_MS = 48 * 60 * 60 * 1000;

export type CreatePatientSelfRegisterInviteResult =
  | {
      ok: true;
      token: string;
      expiresAt: Date;
      tenantSlug: string;
    }
  | { ok: false; code: "TENANT_SLUG_MISSING" };

export async function runCreatePatientSelfRegisterInvite(params: {
  tenantId: string;
  createdByUserId: string;
  clientId: string | null;
}): Promise<CreatePatientSelfRegisterInviteResult> {
  const { tenantId, createdByUserId, clientId } = params;

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await patientSelfRegisterInvitePrismaRepository.createInvite({
    tenantId,
    token,
    expiresAt,
    createdByUserId,
    clientId: clientId ?? null,
  });

  const tenant = await tenantPrismaRepository.findTenantNameAndSlugById(tenantId);
  const tenantSlug = tenant?.slug ?? "";
  if (!tenantSlug) {
    return { ok: false, code: "TENANT_SLUG_MISSING" };
  }

  return { ok: true, token, expiresAt, tenantSlug };
}
