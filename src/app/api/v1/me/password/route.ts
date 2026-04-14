import bcrypt from "bcryptjs";
import { AuditEventType, recordAuditEvent } from "@/infrastructure/audit/record-audit-event";
import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { changePasswordBodySchema } from "@/lib/validators/profile";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = changePasswordBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const user = await prisma.user.findFirst({
    where: { id: auth.session!.user.id, deletedAt: null },
    select: { id: true, passwordHash: true },
  });
  if (!user?.passwordHash) {
    return jsonError("FORBIDDEN", apiT("errors.noLocalPassword"), 403);
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    return jsonError("INVALID_CREDENTIALS", apiT("errors.wrongCurrentPassword"), 401);
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await recordAuditEvent(prisma, {
    tenantId: tenantCtx.tenantId,
    clientId: null,
    patientPathwayId: null,
    actorUserId: user.id,
    type: AuditEventType.STAFF_PASSWORD_CHANGED,
    payload: { userId: user.id },
  });

  return jsonSuccess({ message: apiT("success.passwordUpdated") });
}
