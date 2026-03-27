import { prisma } from "@/infrastructure/database/prisma";
import { jsonError, jsonSuccess } from "@/lib/api-response";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return jsonSuccess({ status: "ok", database: "up" });
  } catch {
    return jsonError("DB_UNAVAILABLE", "Não foi possível conectar ao banco.", 503);
  }
}
