import { prisma } from "@/infrastructure/database/prisma";

/** Tenant ativo para rotas públicas com `Tenant.slug` na URL (case-insensitive). */
export async function findActiveTenantBySlug(slug: string) {
  return prisma.tenant.findFirst({
    where: { slug: { equals: slug, mode: "insensitive" }, isActive: true },
    select: { id: true, name: true, slug: true },
  });
}
