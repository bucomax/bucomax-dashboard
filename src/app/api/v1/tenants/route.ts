import { prisma } from "@/infrastructure/database/prisma";
import { jsonSuccess } from "@/lib/api-response";
import { requireSessionOr401 } from "@/lib/auth/guards";

/** Lista tenants aos quais o usuário tem membership. */
export async function GET() {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const rows = await prisma.tenantMembership.findMany({
    where: { userId: auth.session!.user.id },
    include: { tenant: true },
    orderBy: { tenant: { name: "asc" } },
  });

  return jsonSuccess({
    tenants: rows.map((r) => ({
      id: r.tenant.id,
      name: r.tenant.name,
      slug: r.tenant.slug,
      role: r.role,
    })),
  });
}
