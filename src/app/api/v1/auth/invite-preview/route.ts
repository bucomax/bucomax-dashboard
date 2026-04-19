import { runGetInviteSetPasswordPreview } from "@/application/use-cases/auth/get-invite-set-password-preview";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { joinTranslatedZodIssues } from "@/lib/api/zod-i18n";
import { invitePreviewQuerySchema } from "@/lib/validators/invite-preview-query";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { rateLimit } = await import("@/lib/api/rate-limit");
  const limited = await rateLimit("auth");
  if (limited) return limited;

  const apiT = await getApiT(request);

  const { searchParams } = new URL(request.url);
  const parsed = invitePreviewQuerySchema.safeParse({
    token: searchParams.get("token") ?? "",
  });
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      joinTranslatedZodIssues(parsed.error, apiT as (key: string) => string),
      422,
    );
  }

  const preview = await runGetInviteSetPasswordPreview(parsed.data.token);

  /** `null` quando o token não é válido — mesma resposta para não enumerar tokens. */
  return jsonSuccess({ preview });
}
