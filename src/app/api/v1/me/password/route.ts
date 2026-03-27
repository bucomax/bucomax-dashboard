import bcrypt from "bcryptjs";
import { prisma } from "@/infrastructure/database/prisma";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { requireSessionOr401 } from "@/lib/auth/guards";
import { changePasswordBodySchema } from "@/lib/validators/profile";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Corpo JSON inválido.", 400);
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
    return jsonError("FORBIDDEN", "Conta sem senha local; use o fluxo de convite ou provedor.", 403);
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    return jsonError("INVALID_CREDENTIALS", "Senha atual incorreta.", 401);
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return jsonSuccess({ message: "Senha atualizada." });
}
