import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { pingDatabase } from "@/application/use-cases/health/ping-database";

export async function GET(request: Request) {
  const ok = await pingDatabase();
  if (ok) {
    return jsonSuccess({ status: "ok", database: "up" });
  }
  const apiT = await getApiT(request);
  return jsonError("DB_UNAVAILABLE", apiT("errors.dbUnavailable"), 503);
}
