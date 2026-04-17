/**
 * Probe de duração no Prisma (evento `query`) — inclui cenários **pesados** parecidos com
 * as rotas HTTP que mais aparecem no audit (detalhe de jornada, arquivos, lista de clientes).
 *
 * Uso:
 *   npm run audit:prisma-queries
 *   PRISMA_SLOW_QUERY_MS=25 PRISMA_PROBE_ROUNDS=8 PRISMA_PROBE_CONCURRENCY=12 npm run audit:prisma-queries
 *
 * Variáveis:
 *   DATABASE_URL, PRISMA_SLOW_QUERY_MS, PRISMA_PROBE_ROUNDS (default 8), PRISMA_PROBE_CONCURRENCY (default 12)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { CLIENT_LIST_INCLUDE } from "@/application/use-cases/client/serialize-client-list";

const SLOW_MS = Number(process.env.PRISMA_SLOW_QUERY_MS ?? 25);
const PROBE_ROUNDS = Math.max(1, Math.min(50, Number(process.env.PRISMA_PROBE_ROUNDS ?? 8)));
const PROBE_CONCURRENCY = Math.max(1, Math.min(64, Number(process.env.PRISMA_PROBE_CONCURRENCY ?? 12)));

function tryLoadEnvFromDotEnv() {
  const p = resolve(process.cwd(), ".env");
  if (!existsSync(p)) return;
  const lines = readFileSync(p, "utf8").split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

if (!process.env.DATABASE_URL) {
  tryLoadEnvFromDotEnv();
}

type QueryEntry = { duration: number; query: string; params: string };

const queries: QueryEntry[] = [];

const prisma = new PrismaClient({
  log: [{ emit: "event", level: "query" }],
});

prisma.$on("query", (e) => {
  queries.push({
    duration: e.duration,
    query: e.query,
    params: e.params,
  });
  if (e.duration >= SLOW_MS) {
    console.warn(
      `[slow ≥${SLOW_MS}ms] ${e.duration}ms — ${e.query.replace(/\s+/g, " ").slice(0, 140)}…`,
    );
  }
});

type ProbeCtx = {
  tenantId: string;
  clientId: string;
  patientPathwayId: string;
  currentStageId: string;
};

async function resolveProbeCtx(): Promise<ProbeCtx | null> {
  const tenant = await prisma.tenant.findFirst({ select: { id: true } });
  if (!tenant) return null;
  const pp = await prisma.patientPathway.findFirst({
    where: { tenantId: tenant.id },
    select: {
      id: true,
      clientId: true,
      currentStageId: true,
    },
  });
  if (!pp) return null;
  return {
    tenantId: tenant.id,
    clientId: pp.clientId,
    patientPathwayId: pp.id,
    currentStageId: pp.currentStageId,
  };
}

/** Espelha GET /api/v1/patient-pathways/:id (include grande). */
async function heavyPatientPathwayDetail(ctx: ProbeCtx) {
  const row = await prisma.patientPathway.findFirst({
    where: { id: ctx.patientPathwayId, tenantId: ctx.tenantId },
    include: {
      client: { select: { id: true, name: true, phone: true, caseDescription: true } },
      pathway: { select: { id: true, name: true, description: true } },
      pathwayVersion: {
        select: {
          id: true,
          version: true,
          stages: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              stageKey: true,
              sortOrder: true,
              alertWarningDays: true,
              alertCriticalDays: true,
              defaultAssigneeUserId: true,
            },
          },
        },
      },
      currentStage: true,
      currentStageAssignee: { select: { id: true, name: true, email: true } },
      transitions: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          fromStage: { select: { id: true, name: true, stageKey: true } },
          toStage: { select: { id: true, name: true, stageKey: true } },
          actor: { select: { id: true, name: true, email: true } },
          forcedByUser: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  if (!row) return;

  await Promise.all([
    prisma.pathwayStageChecklistItem.findMany({
      where: { pathwayStageId: row.currentStageId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, label: true, requiredForTransition: true },
    }),
    prisma.patientPathwayChecklistItem.findMany({
      where: { patientPathwayId: row.id },
      select: { checklistItemId: true, completedAt: true },
    }),
  ]);
}

/** Espelha GET /api/v1/clients/:id/files (count + página). */
async function heavyClientFiles(ctx: ProbeCtx) {
  const where = { tenantId: ctx.tenantId, clientId: ctx.clientId };
  await Promise.all([
    prisma.fileAsset.count({ where }),
    prisma.fileAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 50,
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
        patientPortalReviewStatus: true,
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);
}

/** Espelha parte da lista de clientes (include de cartão). */
async function heavyClientCard(ctx: ProbeCtx) {
  await prisma.client.findFirst({
    where: { id: ctx.clientId, tenantId: ctx.tenantId, deletedAt: null },
    include: CLIENT_LIST_INCLUDE,
  });
}

/** Membros do tenant (GET /tenant/members). */
async function heavyTenantMembers(ctx: ProbeCtx) {
  await prisma.tenantMembership.findMany({
    where: { tenantId: ctx.tenantId },
    include: {
      user: {
        select: { id: true, email: true, name: true, deletedAt: true },
      },
    },
    orderBy: { user: { email: "asc" } },
  });
}

/** Leitura tipo Kanban: muitos PatientPathway ativos no tenant com includes mínimos. */
async function heavyPatientPathwayScan(ctx: ProbeCtx) {
  await prisma.patientPathway.findMany({
    where: { tenantId: ctx.tenantId, completedAt: null },
    take: 100,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      enteredStageAt: true,
      updatedAt: true,
      client: { select: { id: true, name: true, phone: true } },
      currentStage: {
        select: {
          id: true,
          stageKey: true,
          name: true,
          sortOrder: true,
          alertWarningDays: true,
          alertCriticalDays: true,
        },
      },
      currentStageAssignee: { select: { id: true, name: true, email: true } },
    },
  });
}

async function runBaselineSamples() {
  await prisma.$queryRaw`SELECT 1`;
  await prisma.tenant.findFirst({ select: { id: true, slug: true } });
  await prisma.client.findFirst({ select: { id: true, tenantId: true } });
  await prisma.patientPathway.findFirst({
    select: { id: true, tenantId: true, currentStageId: true },
  });
  await prisma.carePathway.findFirst({
    select: { id: true, tenantId: true },
  });
}

/** Um passe completo de cenários pesados (sequencial dentro do passe). */
async function heavyScenarioPass(ctx: ProbeCtx) {
  await heavyPatientPathwayDetail(ctx);
  await heavyClientFiles(ctx);
  await heavyClientCard(ctx);
  await heavyTenantMembers(ctx);
  await heavyPatientPathwayScan(ctx);
}

async function runHeavyLoad(ctx: ProbeCtx) {
  for (let r = 0; r < PROBE_ROUNDS; r++) {
    await Promise.all(
      Array.from({ length: PROBE_CONCURRENCY }, () => heavyScenarioPass(ctx)),
    );
  }
}

function sqlOneLine(sql: string, maxLen: number) {
  const one = sql.replace(/\s+/g, " ").trim();
  return one.length > maxLen ? `${one.slice(0, maxLen - 1)}…` : one;
}

/** Agrupa SQL sem valores bind ($1…) para ver padrão que mais tempo somou. */
function aggregateQueries(entries: QueryEntry[], topN: number) {
  const map = new Map<string, { count: number; totalMs: number; maxMs: number }>();
  for (const e of entries) {
    const key = e.query
      .replace(/\$(\d+)/g, "?")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 130);
    const cur = map.get(key) ?? { count: 0, totalMs: 0, maxMs: 0 };
    cur.count += 1;
    cur.totalMs += e.duration;
    cur.maxMs = Math.max(cur.maxMs, e.duration);
    map.set(key, cur);
  }
  return [...map.entries()]
    .sort((a, b) => b[1].totalMs - a[1].totalMs)
    .slice(0, topN);
}

function printSummary(ctx: ProbeCtx | null) {
  const sorted = [...queries].sort((a, b) => b.duration - a.duration);
  console.log("\n── Top 30 queries (maior duração instantânea) ──\n");
  const sqlMax = Math.min(76, Math.max(48, (process.stdout.columns ?? 80) - 14));
  for (const q of sorted.slice(0, 30)) {
    console.log(`${q.duration.toFixed(1).padStart(6)} ms  ${sqlOneLine(q.query, sqlMax)}`);
  }

  const max = sorted[0]?.duration ?? 0;
  const sum = queries.reduce((a, q) => a + q.duration, 0);
  console.log(
    `\nTotal eventos query: ${queries.length} | soma durações: ${sum.toFixed(1)} ms | pico instantâneo: ${max.toFixed(1)} ms`,
  );

  console.log("\n── Padrões SQL que mais tempo somaram (agregado) ──\n");
  const agg = aggregateQueries(queries, 12);
  for (const [sig, s] of agg) {
    const avg = s.count ? (s.totalMs / s.count).toFixed(2) : "0";
    console.log(
      `${s.totalMs.toFixed(1).padStart(8)} ms total | ${String(s.count).padStart(4)}× | max ${s.maxMs.toFixed(1)} | média ${avg} ms`,
    );
    console.log(`   ${sqlOneLine(sig, 100)}`);
  }

  console.log(`
── Leitura rápida ──
- Pico no seed pequeno costuma ser o bloco PatientPathway (include + 50 transitions + estágios + checklists).
- FileAsset count + findMany: já há índice composto tenantId+clientId+review em schema — em produção grande, confira EXPLAIN.
- Cenários rodam ${PROBE_ROUNDS} rodada(s) × ${PROBE_CONCURRENCY} passes paralelos → estresse do pool Prisma/Postgres.
- Para HTTP sob carga: npm run audit:api-latency (latência fim-a-fim inclui Next/auth).

Contexto usado: ${ctx ? `tenant=${ctx.tenantId.slice(0, 10)}… client=${ctx.clientId.slice(0, 10)}… pp=${ctx.patientPathwayId.slice(0, 10)}…` : "(sem dados)"}
`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não definido (configure .env ou export).");
    process.exit(1);
  }

  console.log(
    `=== Bucomax — probe Prisma (slow ≥ ${SLOW_MS} ms | rounds=${PROBE_ROUNDS} conc=${PROBE_CONCURRENCY}) ===`,
  );

  await runBaselineSamples();

  const ctx = await resolveProbeCtx();
  if (!ctx) {
    console.error("Sem tenant/patientPathway no banco — rode db:seed ou crie dados.");
    printSummary(null);
    await prisma.$disconnect();
    process.exit(1);
  }

  console.error(
    `[probe] ctx tenant=${ctx.tenantId.slice(0, 12)}… client=${ctx.clientId.slice(0, 12)}… pp=${ctx.patientPathwayId.slice(0, 12)}…`,
  );

  await runHeavyLoad(ctx);

  printSummary(ctx);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
