/**
 * Seed: Cadastra o app WhatsApp Business e ativa para todos os tenants.
 *
 * Uso:
 *   npx tsx packages/prisma/seed-whatsapp.ts
 *   npm run db:seed:whatsapp
 *
 * Autossuficiente — não depende do seed principal.
 */

import {
  AppCategory,
  AppRenderMode,
  AppPricingModel,
  AppBillingInterval,
  PrismaClient,
  TenantAppStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ── Upsert do app WhatsApp Business ────────────────────────────────────
  const app = await prisma.app.upsert({
    where: { slug: "whatsapp-business" },
    update: {},
    create: {
      slug: "whatsapp-business",
      name: "WhatsApp Business",
      tagline: "Envio automático de mensagens e documentos via WhatsApp.",
      description:
        "Integração com a API do WhatsApp Business para envio de mensagens, documentos e notificações automáticas na transição de etapas.",
      category: AppCategory.communication,
      renderMode: AppRenderMode.internal,
      internalRoute: "/dashboard/apps/whatsapp-business",
      accentColor: "#25D366",
      developerName: "Bucomax",
      requiresConfig: false,
      configSchema: [
        {
          key: "phoneNumberId",
          label: { "pt-BR": "ID do número", en: "Phone Number ID" },
          type: "text",
          required: true,
          placeholder: "123456789012345",
        },
        {
          key: "accessToken",
          label: { "pt-BR": "Token de acesso", en: "Access Token" },
          type: "secret",
          required: true,
          helpText: {
            "pt-BR": "Token permanente da API do WhatsApp Business.",
            en: "Permanent token from WhatsApp Business API.",
          },
        },
      ],
      isPublished: true,
      isFeatured: true,
      sortOrder: 1,
      pricingModel: AppPricingModel.flat,
      priceInCents: 9900,
      priceCurrency: "BRL",
      billingInterval: AppBillingInterval.monthly,
      trialDays: 14,
    },
  });

  console.log(`App: ${app.name} (${app.id})`);

  // ── Ativar para todos os tenants ───────────────────────────────────────
  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });
  if (tenants.length === 0) {
    console.log("Nenhum tenant encontrado — app cadastrado mas não ativado.");
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    const adminMembership = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant.id, role: "tenant_admin" },
      select: { userId: true },
    });

    const existing = await prisma.tenantApp.findUnique({
      where: { tenantId_appId: { tenantId: tenant.id, appId: app.id } },
    });

    if (existing) {
      if (existing.status !== TenantAppStatus.active) {
        await prisma.tenantApp.update({
          where: { id: existing.id },
          data: {
            status: TenantAppStatus.active,
            activatedAt: new Date(),
            activatedById: adminMembership?.userId ?? null,
          },
        });
        console.log(`  ✓ ${tenant.slug}: atualizado para active`);
        created++;
      } else {
        console.log(`  - ${tenant.slug}: já ativo (skip)`);
        skipped++;
      }
      continue;
    }

    await prisma.tenantApp.create({
      data: {
        tenantId: tenant.id,
        appId: app.id,
        status: TenantAppStatus.active,
        activatedAt: new Date(),
        activatedById: adminMembership?.userId ?? null,
      },
    });
    console.log(`  ✓ ${tenant.slug}: ativado`);
    created++;
  }

  console.log(`\nResultado: ${created} ativados, ${skipped} já ativos.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
