import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { prisma } from "@/infrastructure/database/prisma";
import { notifyStaffPatientSelfRegistered } from "@/infrastructure/email/notify-patient-self-registered";
import { getApiT } from "@/lib/api/i18n";
import { joinTranslatedZodIssues } from "@/lib/api/zod-i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
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
    include: { tenant: { select: { name: true, isActive: true } } },
  });

  const now = new Date();
  const ok =
    row &&
    row.usedAt == null &&
    row.expiresAt > now &&
    row.tenant.isActive;

  if (!ok) {
    return jsonSuccess({ valid: false } satisfies { valid: boolean });
  }

  return jsonSuccess({
    valid: true,
    tenantName: row.tenant.name,
    expiresAt: row.expiresAt.toISOString(),
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

        const client = await tx.client.create({
          data: {
            tenantId: inv.tenantId,
            name: clientFields.name.trim(),
            phone: clientFields.phone.trim(),
            email: clientFields.email ?? null,
            caseDescription: clientFields.caseDescription?.trim() || null,
            documentId: clientFields.documentId,
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
