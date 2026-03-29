import { prisma } from "@/infrastructure/database/prisma";

export type TenantContextItem = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

type ListTenantsParams = {
  userId: string;
  isSuperAdmin: boolean;
};

export async function listTenantsForUserContext({
  userId,
  isSuperAdmin,
}: ListTenantsParams): Promise<TenantContextItem[]> {
  if (isSuperAdmin) {
    const rows = await prisma.tenant.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });

    return rows.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      role: "super_admin",
    }));
  }

  const rows = await prisma.tenantMembership.findMany({
    where: { userId, tenant: { isActive: true } },
    include: { tenant: true },
    orderBy: { tenant: { name: "asc" } },
  });

  return rows.map((membership) => ({
    id: membership.tenant.id,
    name: membership.tenant.name,
    slug: membership.tenant.slug,
    role: membership.role,
  }));
}
