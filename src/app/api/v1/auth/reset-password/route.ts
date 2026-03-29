import bcrypt from "bcryptjs";
import { AuthTokenPurpose } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { resetPasswordSchema } from "@/lib/validators/auth";

export const dynamic = "force-dynamic";

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

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const { token, newPassword } = parsed.data;

  const row = await prisma.userAuthToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (
    !row ||
    row.usedAt ||
    (row.purpose !== AuthTokenPurpose.PASSWORD_RESET &&
      row.purpose !== AuthTokenPurpose.INVITE_SET_PASSWORD)
  ) {
    return jsonError("INVALID_TOKEN", apiT("errors.invalidLinkOrUsed"), 400);
  }

  if (row.expiresAt < new Date()) {
    return jsonError("TOKEN_EXPIRED", apiT("errors.linkExpired"), 400);
  }

  if (row.purpose === AuthTokenPurpose.PASSWORD_RESET && !row.user.passwordHash) {
    return jsonError("INVALID_TOKEN", apiT("errors.useInviteForFirstPassword"), 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: {
        passwordHash,
        ...(row.tenantId ? { activeTenantId: row.tenantId } : {}),
      },
    }),
    prisma.userAuthToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return jsonSuccess({
    message: apiT("success.passwordResetDone"),
  });
}
