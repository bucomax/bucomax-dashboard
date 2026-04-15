import type { Prisma } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import type { ParsedPortalLogin } from "@/lib/patient-portal/login-identifier";

const baseSelect = {
  id: true,
  email: true,
  phone: true,
  name: true,
  documentId: true,
  isMinor: true,
  guardianPhone: true,
  guardianEmail: true,
  portalPasswordHash: true,
  portalPasswordChangedAt: true,
} satisfies Prisma.ClientSelect;

export type PortalClientForLogin = Prisma.ClientGetPayload<{ select: typeof baseSelect }>;

export function buildWhereByPortalLogin(
  tenantId: string,
  parsed: ParsedPortalLogin,
): Prisma.ClientWhereInput {
  if (parsed.kind === "cpf") {
    return {
      tenantId,
      deletedAt: null,
      OR: [
        { documentId: parsed.cpf11 },
        { isMinor: true, guardianDocumentId: parsed.cpf11 },
      ],
    };
  }
  return {
    tenantId,
    deletedAt: null,
    email: { equals: parsed.emailNorm, mode: "insensitive" },
  };
}

export async function findClientForPortalLogin(
  tenantId: string,
  parsed: ParsedPortalLogin,
): Promise<PortalClientForLogin | null> {
  return prisma.client.findFirst({
    where: buildWhereByPortalLogin(tenantId, parsed),
    select: baseSelect,
  });
}
