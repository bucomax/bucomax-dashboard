#!/usr/bin/env node
/**
 * Carga **pesada** — autônomo do `load:test` (defaults mais agressivos + cenários em sequência).
 *
 *   npm run load:heavy
 *   HEAVY_CONNECTIONS=200 HEAVY_DURATION_SEC=120 npm run load:heavy
 *   LOAD_TEST_COOKIE='...' npm run load:heavy
 *
 * Opcional: falhar se houver erros de rede (timeouts / connection refused):
 *   HEAVY_FAIL_ON_ERRORS=1 npm run load:heavy
 */

import autocannon from "autocannon";
import { getBaseUrl } from "./lib/base-url.mjs";

const base = getBaseUrl();
const duration = Number(process.env.HEAVY_DURATION_SEC ?? 90);
const connections = Number(process.env.HEAVY_CONNECTIONS ?? 120);
const pipelining = Number(process.env.HEAVY_PIPELINING ?? 1);
const cookie = process.env.LOAD_TEST_COOKIE?.trim();
const failOnErrors = process.env.HEAVY_FAIL_ON_ERRORS === "1";

if (!Number.isFinite(duration) || duration < 1) {
  console.error("HEAVY_DURATION_SEC inválido");
  process.exit(1);
}
if (!Number.isFinite(connections) || connections < 1) {
  console.error("HEAVY_CONNECTIONS inválido");
  process.exit(1);
}

console.log(`
=== Bucomax — carga PESADA (autocannon) ===
Base:           ${base}
Conexões:       ${connections}
Duração (s):    ${duration}
Pipelining:     ${pipelining}
Cookie ( /me ): ${cookie ? "sim" : "não"}
Falhar c/ erro: ${failOnErrors ? "sim" : "não"}
`);

async function runScenario(title, opts) {
  console.log(`\n######## ${title} ########`);
  const result = await autocannon({
    ...opts,
    duration,
    connections,
    pipelining,
  });
  console.log(autocannon.printResult(result));
  const netErrors = (result.errors ?? 0) + (result.timeouts ?? 0);
  if (failOnErrors && netErrors > 0) {
    console.error(`\nFalha HEAVY_FAIL_ON_ERRORS: errors=${result.errors} timeouts=${result.timeouts}`);
    process.exit(1);
  }
  return result;
}

async function main() {
  await runScenario("GET /api/v1/health (DB + Node sob pressão prolongada)", {
    url: `${base}/api/v1/health`,
    method: "GET",
  });

  if (cookie) {
    await runScenario("GET /api/v1/me (sessão real — rate limit api 120/min por usuário)", {
      url: `${base}/api/v1/me`,
      method: "GET",
      headers: { cookie },
    });
  } else {
    console.log("\n(dica: defina LOAD_TEST_COOKIE para martelar /api/v1/me também)");
  }

  console.log("\nCarga pesada concluída.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
