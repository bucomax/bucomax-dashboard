/**
 * Inspeciona um paciente (`Client`) no banco apontado por `DATABASE_URL` no `.env` da raiz.
 *
 * Uso:
 *   npx tsx scripts/db-inspect/inspect-client.ts <clientId>
 *   CLIENT_ID=... npx tsx scripts/db-inspect/inspect-client.ts
 */

import { PrismaClient } from "@prisma/client";

import { loadRootEnv } from "../../e2e/load-root-env";

function argClientId(): string {
  const direct = process.argv[2]?.trim();
  if (direct) return direct;
  const fromEnv = process.env.CLIENT_ID?.trim();
  if (fromEnv) return fromEnv;
  console.error("Passe o id do paciente: npx tsx scripts/db-inspect/inspect-client.ts <clientId>");
  process.exit(1);
}

async function main() {
  loadRootEnv();
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não definida no ambiente.");
    process.exit(1);
  }

  const clientId = argClientId();
  const prisma = new PrismaClient();

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        portalPasswordHash: true,
      },
    });

    const tenant = client
      ? await prisma.tenant.findUnique({
          where: { id: client.tenantId },
          select: { id: true, name: true, slug: true, isActive: true },
        })
      : null;

    const [audits, invites, pathways] = await Promise.all([
      prisma.auditEvent.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          type: true,
          actorUserId: true,
          patientPathwayId: true,
          createdAt: true,
          payload: true,
        },
      }),
      prisma.patientSelfRegisterInvite.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          token: true,
          usedAt: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
      prisma.patientPathway.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          pathwayId: true,
          completedAt: true,
          createdAt: true,
          pathway: { select: { name: true } },
        },
      }),
    ]);

    const out = {
      clientId,
      client: client
        ? {
            ...client,
            portalPasswordHash: client.portalPasswordHash ? "[set]" : null,
          }
        : null,
      tenant,
      auditEventCount: audits.length,
      auditEvents: audits,
      patientSelfRegisterInvites: invites.map((inv) => ({
        ...inv,
        token: `${inv.token.slice(0, 8)}…`,
      })),
      patientPathways: pathways,
    };

    console.log(JSON.stringify(out, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
