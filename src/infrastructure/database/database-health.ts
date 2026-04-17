import { prisma } from "@/infrastructure/database/prisma";

export async function runDatabasePing(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
