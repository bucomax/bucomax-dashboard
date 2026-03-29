import { GlobalRole, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { tenants } from "./seed/data";
import { seedTenant, upsertUser } from "./seed/seed-tenant";
import type { TenantContext } from "./seed/types";

const prisma = new PrismaClient();
const DEV_PASSWORD = "dev123456";

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);
  const superEmail = "dev@bucomax.local";
  const seedTenantSlugs = tenants.map((tenant) => tenant.slug);

  await prisma.tenant.deleteMany({
    where: {
      slug: {
        in: seedTenantSlugs,
      },
    },
  });

  const superUser = await upsertUser(prisma, {
    email: superEmail,
    name: "Dev Super Admin",
    passwordHash,
    globalRole: GlobalRole.super_admin,
  });

  const contexts: TenantContext[] = [];
  for (const seed of tenants) {
    contexts.push(
      await seedTenant(prisma, {
        seed,
        passwordHash,
        superUserId: superUser.id,
      }),
    );
  }

  const firstTenantId = contexts[0]?.tenantId ?? null;
  if (firstTenantId) {
    await prisma.user.update({
      where: { id: superUser.id },
      data: { activeTenantId: firstTenantId },
    });
  }

  console.log("Seed OK:", {
    password: DEV_PASSWORD,
    superAdmin: superEmail,
    tenants: tenants.map((tenant) => ({
      slug: tenant.slug,
      admin: tenant.adminEmail,
      user: tenant.userEmail,
      pathways: tenant.pathways.length,
      clients: tenant.clients.length,
      suppliers: tenant.suppliers.length,
    })),
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
