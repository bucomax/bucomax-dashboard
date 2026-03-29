import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  const apiT = await getApiT(request);
  try {
    await prisma.$queryRaw`SELECT 1`;
    return jsonSuccess({ status: "ok", database: "up" });
  } catch {
    return jsonError("DB_UNAVAILABLE", apiT("errors.dbUnavailable"), 503);
  }
}
