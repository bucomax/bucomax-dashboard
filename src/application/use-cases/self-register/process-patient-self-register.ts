import bcrypt from "bcryptjs";
import { z } from "zod";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { AuditEventType } from "@prisma/client";
import { auditEventPrismaRepository } from "@/infrastructure/repositories/audit-event.repository";
import {
  findPatientSelfRegisterInviteForPreview,
  runPatientSelfRegisterSerializableTransaction,
} from "@/infrastructure/repositories/patient-self-register-flow.repository";
import { notifyPatientSelfRegisterWelcome } from "@/infrastructure/email/notify-patient-self-register-welcome";
import { notifyStaffPatientSelfRegistered } from "@/infrastructure/email/notify-patient-self-registered";
import { validatePublicInviteTenantSlug } from "@/application/use-cases/auth/validate-invite-tenant-slug";
import { formatClientBirthDateIso } from "@/application/use-cases/client/serialize-client-list";
import {
  PUBLIC_SELF_REGISTER_PRIVACY_VERSION,
  PUBLIC_SELF_REGISTER_TERMS_VERSION,
} from "@/lib/constants/public-registration-consent";
import { publicPatientSelfRegisterBodySchema } from "@/lib/validators/client";

export type ProcessPatientSelfRegisterBody = z.infer<typeof publicPatientSelfRegisterBodySchema>;

export { publicPatientSelfRegisterBodySchema };

export type PatientSelfRegisterGetPreview =
  | { valid: false }
  | {
      valid: true;
      tenantName: string;
      tenantTaxId: string | null;
      expiresAt: string;
      formPrefill?: Record<string, unknown>;
    };

export async function loadPatientSelfRegisterInvitePreview(
  request: Request,
  token: string,
): Promise<PatientSelfRegisterGetPreview> {
  if (!token) {
    return { valid: false };
  }

  const row = await findPatientSelfRegisterInviteForPreview(token);

  const now = new Date();
  const clientOk =
    !row?.clientId ||
    (row.client != null && row.client.deletedAt == null);
  const ok =
    row &&
    row.usedAt == null &&
    row.expiresAt > now &&
    row.tenant.isActive &&
    clientOk;

  if (!ok) {
    return { valid: false };
  }

  if (!(await validatePublicInviteTenantSlug(request, row.tenantId))) {
    return { valid: false };
  }

  const formPrefill =
    row.clientId && row.client && row.client.deletedAt == null
      ? {
          name: row.client.name,
          phone: row.client.phone,
          email: row.client.email,
          documentId: row.client.documentId,
          caseDescription: row.client.caseDescription,
          postalCode: row.client.postalCode,
          addressLine: row.client.addressLine,
          addressNumber: row.client.addressNumber,
          addressComp: row.client.addressComp,
          neighborhood: row.client.neighborhood,
          city: row.client.city,
          state: row.client.state,
          isMinor: row.client.isMinor,
          birthDate: formatClientBirthDateIso(row.client.birthDate),
          guardianName: row.client.guardianName,
          guardianDocumentId: row.client.guardianDocumentId,
          guardianPhone: row.client.guardianPhone,
          guardianEmail: row.client.guardianEmail,
          guardianRelationship: row.client.guardianRelationship,
          emergencyContactName: row.client.emergencyContactName,
          emergencyContactPhone: row.client.emergencyContactPhone,
          preferredChannel: row.client.preferredChannel,
        }
      : undefined;

  return {
    valid: true,
    tenantName: row.tenant.name,
    tenantTaxId: row.tenant.taxId,
    expiresAt: row.expiresAt.toISOString(),
    ...(formPrefill ? { formPrefill } : {}),
  };
}

export type CompletePatientSelfRegisterErrorCode = "INVALID_TOKEN" | "SERIALIZABLE_CONFLICT";

/**
 * POST público: cria/atualiza `Client`, marca convite usado, auditoria e e-mails de boas-vindas (fire-and-forget).
 */
export async function runCompletePatientSelfRegister(
  request: Request,
  data: ProcessPatientSelfRegisterBody,
): Promise<{ ok: true } | { ok: false; code: CompletePatientSelfRegisterErrorCode }> {
  const { token, password, ...clientFields } = data;
  const patientEmail = clientFields.email?.trim() ?? "";
  const portalPasswordHash = await bcrypt.hash(password, 12);
  const portalPasswordChangedAt = new Date();

  let clientId = "";
  let patientName = "";
  let clinicName = "";
  let tenantId = "";
  let tenantSlug = "";

  try {
    const result = await runPatientSelfRegisterSerializableTransaction(
      async (tx) => {
        const inv = await tx.patientSelfRegisterInvite.findUnique({
          where: { token },
          include: { tenant: { select: { id: true, name: true, slug: true, isActive: true } } },
        });

        const now = new Date();
        if (
          !inv ||
          inv.usedAt != null ||
          inv.expiresAt <= now ||
          !inv.tenant.isActive
        ) {
          return null;
        }

        if (!(await validatePublicInviteTenantSlug(request, inv.tenantId))) {
          return null;
        }

        if (inv.clientId) {
          const existing = await tx.client.findFirst({
            where: { id: inv.clientId, tenantId: inv.tenantId, deletedAt: null },
            select: { id: true },
          });
          if (!existing) {
            return null;
          }

          const cf = clientFields;
          const updated = await tx.client.update({
            where: { id: existing.id },
            data: {
              name: cf.name,
              phone: cf.phone,
              email: cf.email,
              caseDescription: cf.caseDescription,
              documentId: cf.documentId,
              postalCode: cf.postalCode,
              addressLine: cf.addressLine,
              addressNumber: cf.addressNumber,
              addressComp: cf.addressComp,
              neighborhood: cf.neighborhood,
              city: cf.city,
              state: cf.state,
              isMinor: cf.isMinor,
              birthDate: cf.birthDate,
              guardianName: cf.guardianName,
              guardianDocumentId: cf.guardianDocumentId,
              guardianPhone: cf.guardianPhone,
              guardianEmail: cf.guardianEmail,
              guardianRelationship: cf.guardianRelationship,
              emergencyContactName: cf.emergencyContactName,
              emergencyContactPhone: cf.emergencyContactPhone,
              preferredChannel: cf.preferredChannel,
              portalPasswordHash,
              portalPasswordChangedAt,
            },
            select: { id: true, name: true },
          });

          await tx.patientSelfRegisterInvite.update({
            where: { id: inv.id },
            data: { usedAt: now },
          });

          return {
            clientId: updated.id,
            patientName: updated.name,
            clinicName: inv.tenant.name,
            tenantSlug: inv.tenant.slug,
            tenantId: inv.tenantId,
            inviteId: inv.id,
            mode: "update" as const,
          };
        }

        const cf = clientFields;
        const client = await tx.client.create({
          data: {
            tenantId: inv.tenantId,
            name: cf.name,
            phone: cf.phone,
            email: cf.email,
            caseDescription: cf.caseDescription,
            documentId: cf.documentId,
            postalCode: cf.postalCode,
            addressLine: cf.addressLine,
            addressNumber: cf.addressNumber,
            addressComp: cf.addressComp,
            neighborhood: cf.neighborhood,
            city: cf.city,
            state: cf.state,
            isMinor: cf.isMinor,
            birthDate: cf.birthDate,
            guardianName: cf.guardianName,
            guardianDocumentId: cf.guardianDocumentId,
            guardianPhone: cf.guardianPhone,
            guardianEmail: cf.guardianEmail,
            guardianRelationship: cf.guardianRelationship,
            emergencyContactName: cf.emergencyContactName,
            emergencyContactPhone: cf.emergencyContactPhone,
            preferredChannel: cf.preferredChannel,
            portalPasswordHash,
            portalPasswordChangedAt,
          },
          select: { id: true, name: true },
        });

        await tx.patientSelfRegisterInvite.update({
          where: { id: inv.id },
          data: { usedAt: now },
        });

        return {
          clientId: client.id,
          patientName: client.name,
          clinicName: inv.tenant.name,
          tenantSlug: inv.tenant.slug,
          tenantId: inv.tenantId,
          inviteId: inv.id,
          mode: "create" as const,
        };
      },
    );

    if (!result) {
      return { ok: false, code: "INVALID_TOKEN" };
    }

    clientId = result.clientId;
    patientName = result.patientName;
    clinicName = result.clinicName;
    tenantId = result.tenantId;
    tenantSlug = result.tenantSlug;

    await auditEventPrismaRepository.recordCanonical({
      tenantId: result.tenantId,
      clientId: result.clientId,
      patientPathwayId: null,
      actorUserId: null,
      eventType: AuditEventType.SELF_REGISTER_COMPLETED,
      payload: { inviteId: result.inviteId, mode: result.mode },
    });
    await auditEventPrismaRepository.recordCanonical({
      tenantId: result.tenantId,
      clientId: result.clientId,
      patientPathwayId: null,
      actorUserId: null,
      eventType: AuditEventType.PATIENT_PORTAL_PASSWORD_SET,
      payload: { clientId: result.clientId },
    });
    await auditEventPrismaRepository.recordCanonical({
      tenantId: result.tenantId,
      clientId: result.clientId,
      patientPathwayId: null,
      actorUserId: null,
      eventType: AuditEventType.PATIENT_CONSENT_GIVEN,
      payload: { consentType: "terms", version: PUBLIC_SELF_REGISTER_TERMS_VERSION },
    });
    await auditEventPrismaRepository.recordCanonical({
      tenantId: result.tenantId,
      clientId: result.clientId,
      patientPathwayId: null,
      actorUserId: null,
      eventType: AuditEventType.PATIENT_CONSENT_GIVEN,
      payload: { consentType: "lgpd", version: PUBLIC_SELF_REGISTER_PRIVACY_VERSION },
    });
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2034") {
      return { ok: false, code: "SERIALIZABLE_CONFLICT" };
    }
    throw err;
  }

  notifyStaffPatientSelfRegistered({
    tenantId,
    clientId,
    patientName,
    clinicName,
  }).catch((e) => console.error("[patient-self-register] notify failed:", e));

  if (patientEmail) {
    notifyPatientSelfRegisterWelcome({
      tenantId,
      patientEmail,
      patientName,
      clinicName,
      tenantSlug,
    }).catch((e) => console.error("[patient-self-register] welcome email failed:", e));
  }

  return { ok: true };
}
