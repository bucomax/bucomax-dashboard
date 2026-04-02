import { isGcsConfigured } from "@/infrastructure/storage/gcs-storage";
import { getApiT } from "@/lib/api/i18n";
import { jsonSuccess } from "@/lib/api-response";
import { requireSessionOr401 } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

/**
 * Indica se o painel pode enviar arquivos com URL pública estável (ex.: foto de perfil).
 * Exige GCS configurado + `GCS_PUBLIC_BASE_URL`, pois o fluxo de presign depende disso.
 */
export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const publicBaseConfigured = Boolean(process.env.GCS_PUBLIC_BASE_URL?.trim());
  const available = isGcsConfigured() && publicBaseConfigured;

  return jsonSuccess({ available });
}
