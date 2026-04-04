import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return jsonSuccess({ status: "ok", database: "up" });
  } catch {
    const apiT = await getApiT(request);
    return jsonError("DB_UNAVAILABLE", apiT("errors.dbUnavailable"), 503);
  }
}
