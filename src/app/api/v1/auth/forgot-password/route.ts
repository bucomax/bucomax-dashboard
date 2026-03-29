import { randomBytes } from "crypto";
import { AuthTokenPurpose } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { getResetPasswordHtml } from "@/infrastructure/email/email-templates";
import { isEmailConfigured, sendEmail, buildResetPasswordUrl } from "@/infrastructure/email/resend.client";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { normalizeEmail } from "@/lib/utils/email";
import { forgotPasswordSchema } from "@/lib/validators/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { rateLimit } = await import("@/lib/api/rate-limit");
  const limited = await rateLimit("auth");
  if (limited) return limited;

  const apiT = await getApiT(request);
  if (!isEmailConfigured()) {
    return jsonError("SERVICE_UNAVAILABLE", apiT("errors.passwordResetNotConfigured"), 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const email = normalizeEmail(parsed.data.email);

  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true, name: true, email: true, passwordHash: true },
  });

  const okMessage = {
    message: apiT("success.forgotPasswordHint"),
  };

  if (!user?.passwordHash) {
    return jsonSuccess(okMessage);
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.userAuthToken.create({
    data: {
      token,
      userId: user.id,
      purpose: AuthTokenPurpose.PASSWORD_RESET,
      expiresAt,
    },
  });

  const resetUrl = buildResetPasswordUrl(token);
  const { error } = await sendEmail({
    to: user.email,
    subject: "Bucomax — Redefinir senha",
    html: getResetPasswordHtml({ name: user.name, resetUrl }),
  });

  if (error) {
    console.error("Erro ao enviar email de recuperação:", error);
    return jsonError("EMAIL_SEND_FAILED", apiT("errors.emailSendFailedGeneric"), 500);
  }

  return jsonSuccess(okMessage);
}
