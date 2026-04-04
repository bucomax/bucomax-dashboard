#!/usr/bin/env node
/**
 * Teste de carga HTTP (stress) — não é teste unitário.
 *
 * Uso:
 *   LOAD_TEST_BASE_URL=http://127.0.0.1:3000 npm run load:test
 *   LOAD_TEST_CONNECTIONS=100 LOAD_TEST_DURATION_SEC=30 npm run load:test
 *
 * Com sessão (cookie completo do navegador, ex.: next-auth.session-token=...):
 *   LOAD_TEST_COOKIE='next-auth.session-token=SEU_TOKEN' npm run load:test
 *
 * Requer: `autocannon` (devDependency do projeto).
 */

import autocannon from "autocannon";
import { getBaseUrl } from "./lib/base-url.mjs";

const base = getBaseUrl();
const duration = Number(process.env.LOAD_TEST_DURATION_SEC ?? 20);
const connections = Number(process.env.LOAD_TEST_CONNECTIONS ?? 50);
const pipelining = Number(process.env.LOAD_TEST_PIPELINING ?? 1);
const cookie = process.env.LOAD_TEST_COOKIE?.trim();

if (!Number.isFinite(duration) || duration < 1) {
  console.error("LOAD_TEST_DURATION_SEC inválido");
  process.exit(1);
}
if (!Number.isFinite(connections) || connections < 1) {
  console.error("LOAD_TEST_CONNECTIONS inválido");
  process.exit(1);
}

console.log(`
=== Bucomax — teste de carga (autocannon) ===
Base:          ${base}
Conexões:      ${connections}
Duração (s):   ${duration}
Pipelining:    ${pipelining}
Alvo autent.:  ${cookie ? "sim (/api/v1/me)" : "não (apenas /health)"}
`);

async function runScenario(title, opts) {
  console.log(`\n--- ${title} ---`);
  const result = await autocannon({
    ...opts,
    duration,
    connections,
    pipelining,
  });
  console.log(autocannon.printResult(result));
  return result;
}

async function main() {
  await runScenario("GET /api/v1/health (inclui ping ao banco)", {
    url: `${base}/api/v1/health`,
    method: "GET",
  });

  if (cookie) {
    await runScenario("GET /api/v1/me (com Cookie — gera carga em auth + Prisma)", {
      url: `${base}/api/v1/me`,
      method: "GET",
      headers: { cookie },
    });
  }

  console.log("\nConcluído.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
