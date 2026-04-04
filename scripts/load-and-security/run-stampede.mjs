#!/usr/bin/env node
/**
 * Simula **thundering herd** / “cache stampede”: muitas conexões batendo no **mesmo URL**
 * no mesmo intervalo (pico), como se o cache caísse e todos fossem à origem de uma vez.
 *
 * No app atual quase não há cache HTTP nas rotas API; o alvo típico é um endpoint “quente”
 * (`/api/v1/health` toca Prisma a cada hit = fila no pool / CPU).
 *
 *   npm run load:stampede
 *   STAMPEDE_CONNECTIONS=400 STAMPEDE_DURATION_SEC=4 STAMPEDE_PATH=/api/v1/health npm run load:stampede
 *
 * Com cookie (mesmo URL autenticado — cuidado: também consume rate limit `api`):
 *   LOAD_TEST_COOKIE='...' STAMPEDE_PATH=/api/v1/me npm run load:stampede
 */

import autocannon from "autocannon";
import { getBaseUrl } from "./lib/base-url.mjs";

const base = getBaseUrl();
const duration = Number(process.env.STAMPEDE_DURATION_SEC ?? 5);
const connections = Number(process.env.STAMPEDE_CONNECTIONS ?? 250);
const pipelining = Number(process.env.STAMPEDE_PIPELINING ?? 1);
const rawPath = process.env.STAMPEDE_PATH ?? "/api/v1/health";
const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
const cookie = process.env.LOAD_TEST_COOKIE?.trim();
const failOnErrors = process.env.STAMPEDE_FAIL_ON_ERRORS === "1";

if (!Number.isFinite(duration) || duration < 1) {
  console.error("STAMPEDE_DURATION_SEC inválido");
  process.exit(1);
}
if (!Number.isFinite(connections) || connections < 1) {
  console.error("STAMPEDE_CONNECTIONS inválido");
  process.exit(1);
}

const url = `${base}${path}`;
/** Cookie em rotas públicas é ignorado; em /me autentica. */
const headers = cookie ? { cookie } : {};

console.log(`
=== Bucomax — STAMPEDE (pico no mesmo URL) ===
URL:         ${url}
Conexões:    ${connections} (disparo simultâneo agressivo)
Duração (s): ${duration}
Pipelining:  ${pipelining}
`);

async function main() {
  const result = await autocannon({
    url,
    method: "GET",
    headers: cookie ? headers : undefined,
    duration,
    connections,
    pipelining,
  });

  console.log(autocannon.printResult(result));
  console.log(`\nResumo: ${result.requests.total} reqs | 2xx=${result["2xx"]} 4xx=${result["4xx"]} 5xx=${result["5xx"]} | errors=${result.errors} timeouts=${result.timeouts}`);

  const netErrors = (result.errors ?? 0) + (result.timeouts ?? 0);
  if (failOnErrors && netErrors > 0) {
    console.error("STAMPEDE_FAIL_ON_ERRORS=1 e houve erros/timeouts.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
