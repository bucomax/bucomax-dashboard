import { PrismaClient, GlobalRole, TenantRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEV_PASSWORD = "dev123456";

type TenantSeed = {
  slug: string;
  name: string;
  adminEmail: string;
  adminName: string;
  userEmail: string;
  userName: string;
};

const tenants: TenantSeed[] = [
  {
    slug: "clinica-alpha",
    name: "Clínica Alpha",
    adminEmail: "admin-alpha@idoctor.local",
    adminName: "Admin Alpha",
    userEmail: "user-alpha@idoctor.local",
    userName: "Usuário Alpha",
  },
  {
    slug: "clinica-beta",
    name: "Clínica Beta",
    adminEmail: "admin-beta@idoctor.local",
    adminName: "Admin Beta",
    userEmail: "user-beta@idoctor.local",
    userName: "Usuário Beta",
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  const superEmail = "dev@idoctor.local";
  const superUser = await prisma.user.upsert({
    where: { email: superEmail },
    create: {
      email: superEmail,
      name: "Dev Super Admin",
      passwordHash,
      globalRole: GlobalRole.super_admin,
    },
    update: {
      passwordHash,
      globalRole: GlobalRole.super_admin,
    },
  });

  const createdTenants: { id: string; slug: string }[] = [];

  for (const t of tenants) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: t.slug },
      create: { name: t.name, slug: t.slug },
      update: { name: t.name },
    });
    createdTenants.push({ id: tenant.id, slug: tenant.slug });

    const admin = await prisma.user.upsert({
      where: { email: t.adminEmail },
      create: {
        email: t.adminEmail,
        name: t.adminName,
        passwordHash,
        globalRole: GlobalRole.user,
      },
      update: {
        name: t.adminName,
        passwordHash,
      },
    });

    const memberUser = await prisma.user.upsert({
      where: { email: t.userEmail },
      create: {
        email: t.userEmail,
        name: t.userName,
        passwordHash,
        globalRole: GlobalRole.user,
      },
      update: {
        name: t.userName,
        passwordHash,
      },
    });

    await prisma.tenantMembership.upsert({
      where: {
        userId_tenantId: { userId: admin.id, tenantId: tenant.id },
      },
      create: {
        userId: admin.id,
        tenantId: tenant.id,
        role: TenantRole.tenant_admin,
      },
      update: { role: TenantRole.tenant_admin },
    });

    await prisma.tenantMembership.upsert({
      where: {
        userId_tenantId: { userId: memberUser.id, tenantId: tenant.id },
      },
      create: {
        userId: memberUser.id,
        tenantId: tenant.id,
        role: TenantRole.tenant_user,
      },
      update: { role: TenantRole.tenant_user },
    });
  }

  const firstTenantId = createdTenants[0]?.id;
  if (firstTenantId) {
    await prisma.tenantMembership.upsert({
      where: {
        userId_tenantId: { userId: superUser.id, tenantId: firstTenantId },
      },
      create: {
        userId: superUser.id,
        tenantId: firstTenantId,
        role: TenantRole.tenant_admin,
      },
      update: { role: TenantRole.tenant_admin },
    });

    await prisma.user.update({
      where: { id: superUser.id },
      data: { activeTenantId: firstTenantId },
    });
  }

  console.log("Seed OK:", {
    password: DEV_PASSWORD,
    superAdmin: superEmail,
    tenants: tenants.map((x) => ({
      slug: x.slug,
      admin: x.adminEmail,
      user: x.userEmail,
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
