import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { prisma } from "@/infrastructure/database/prisma";
import { AuditEventType, recordAuditEvent } from "@/infrastructure/audit/record-audit-event";
import { notifyStaffPatientSelfRegistered } from "@/infrastructure/email/notify-patient-self-registered";
import { getApiT } from "@/lib/api/i18n";
import { joinTranslatedZodIssues } from "@/lib/api/zod-i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { validatePublicInviteTenantSlug } from "@/lib/tenants/validate-public-invite-tenant-slug";
import { publicPatientSelfRegisterBodySchema } from "@/lib/validators/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = (url.searchParams.get("token") ?? "").trim();
  if (!token) {
    return jsonSuccess({ valid: false } satisfies { valid: boolean });
  }

  const row = await prisma.patientSelfRegisterInvite.findUnique({
    where: { token },
    include: {
      tenant: { select: { name: true, isActive: true } },
      client: {
        select: {
          name: true,
          phone: true,
          email: true,
          documentId: true,
          caseDescription: true,
          postalCode: true,
          addressLine: true,
          addressNumber: true,
          addressComp: true,
          neighborhood: true,
          city: true,
          state: true,
          isMinor: true,
          guardianName: true,
          guardianDocumentId: true,
          guardianPhone: true,
          deletedAt: true,
        },
      },
    },
  });

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
    return jsonSuccess({ valid: false } satisfies { valid: boolean });
  }

  if (!(await validatePublicInviteTenantSlug(request, row.tenantId))) {
    return jsonSuccess({ valid: false } satisfies { valid: boolean });
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
          guardianName: row.client.guardianName,
          guardianDocumentId: row.client.guardianDocumentId,
          guardianPhone: row.client.guardianPhone,
        }
      : undefined;

  return jsonSuccess({
    valid: true,
    tenantName: row.tenant.name,
    expiresAt: row.expiresAt.toISOString(),
    ...(formPrefill ? { formPrefill } : {}),
  });
}

export async function POST(request: Request) {
  const { rateLimit } = await import("@/lib/api/rate-limit");
  const limited = await rateLimit("auth");
  if (limited) return limited;

  const apiT = await getApiT(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = publicPatientSelfRegisterBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      joinTranslatedZodIssues(parsed.error, apiT as (key: string) => string),
      422,
    );
  }

  const { token, ...clientFields } = parsed.data;

  let clientId = "";
  let patientName = "";
  let clinicName = "";
  let tenantId = "";

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const inv = await tx.patientSelfRegisterInvite.findUnique({
          where: { token },
          include: { tenant: { select: { id: true, name: true, isActive: true } } },
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
              guardianName: cf.guardianName,
              guardianDocumentId: cf.guardianDocumentId,
              guardianPhone: cf.guardianPhone,
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
            guardianName: cf.guardianName,
            guardianDocumentId: cf.guardianDocumentId,
            guardianPhone: cf.guardianPhone,
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
          tenantId: inv.tenantId,
          inviteId: inv.id,
          mode: "create" as const,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (!result) {
      return jsonError(
        "INVALID_TOKEN",
        apiT("errors.patientSelfRegisterInvalidOrExpired"),
        400,
      );
    }

    clientId = result.clientId;
    patientName = result.patientName;
    clinicName = result.clinicName;
    tenantId = result.tenantId;

    await recordAuditEvent(prisma, {
      tenantId: result.tenantId,
      clientId: result.clientId,
      patientPathwayId: null,
      actorUserId: null,
      type: AuditEventType.SELF_REGISTER_COMPLETED,
      payload: { inviteId: result.inviteId, mode: result.mode },
    });
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2034") {
      return jsonError(
        "CONFLICT",
        apiT("errors.patientSelfRegisterInvalidOrExpired"),
        409,
      );
    }
    throw err;
  }

  notifyStaffPatientSelfRegistered({
    tenantId,
    clientId,
    patientName,
    clinicName,
  }).catch((err) => console.error("[patient-self-register] notify failed:", err));

  return jsonSuccess({
    message: apiT("success.patientSelfRegistered"),
  });
}
