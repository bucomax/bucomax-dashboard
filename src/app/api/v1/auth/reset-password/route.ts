import bcrypt from "bcryptjs";
import { AuthTokenPurpose } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { resetPasswordSchema } from "@/lib/validators/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Corpo JSON inválido.", 400);
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
    return jsonError("INVALID_TOKEN", "Link inválido ou já utilizado.", 400);
  }

  if (row.expiresAt < new Date()) {
    return jsonError("TOKEN_EXPIRED", "Link expirado. Solicite um novo.", 400);
  }

  if (row.purpose === AuthTokenPurpose.PASSWORD_RESET && !row.user.passwordHash) {
    return jsonError("INVALID_TOKEN", "Use o fluxo de convite para definir a primeira senha.", 400);
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
    message: "Senha definida com sucesso. Você já pode entrar.",
  });
}
