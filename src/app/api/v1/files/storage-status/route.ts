import { isGcsConfigured } from "@/infrastructure/storage/gcs-storage";
import { getApiT } from "@/lib/api/i18n";
import { jsonSuccess } from "@/lib/api-response";
import { requireSessionOr401 } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

/**
 * Indica se upload direto ao GCS está disponível (credenciais + bucket).
 * Foto de perfil pode usar referência `gcs:key` sem `GCS_PUBLIC_BASE_URL`.
 */
export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  return jsonSuccess({ available: isGcsConfigured() });
}
