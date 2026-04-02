import { prisma } from "@/infrastructure/database/prisma";
import type { StageAssigneeSummaryDto } from "@/types/api/clients-v1";

export async function loadStageAssigneeSummariesMap(
  userIds: string[],
): Promise<Map<string, StageAssigneeSummaryDto>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const rows = await prisma.user.findMany({
    where: { id: { in: unique }, deletedAt: null },
    select: { id: true, name: true, email: true },
  });
  return new Map(
    rows.map((u) => [u.id, { id: u.id, name: u.name, email: u.email } satisfies StageAssigneeSummaryDto]),
  );
}
