#!/usr/bin/env node
/**
 * Suíte focada em **rate limit** (Redis):
 * - preset `auth`: por IP em forgot-password / reset-password (5 req / 60s)
 * - preset `api`: por userId em rotas autenticadas (120 req / 60s) — precisa de cookie
 *
 *   npm run security:rate-limit
 *   RL_STRICT=1 npm run security:rate-limit    → exit 1 se Redis não parece ativo (sem 429 no auth)
 *   LOAD_TEST_COOKIE='next-auth.session-token=...' npm run security:rate-limit
 *
 * Variáveis:
 *   RL_AUTH_REQUESTS (default 30) — paralelo contra /auth/forgot-password
 *   RL_API_REQUESTS (default 130) — paralelo GET /api/v1/me
 */

import { getBaseUrl } from "./lib/base-url.mjs";

const base = getBaseUrl();
const cookie = process.env.LOAD_TEST_COOKIE?.trim();
const strict = process.env.RL_STRICT === "1";
const authRequests = Math.max(1, Number(process.env.RL_AUTH_REQUESTS ?? 30));
const apiRequests = Math.max(1, Number(process.env.RL_API_REQUESTS ?? 130));

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

function tally(statuses) {
  /** @type {Record<number, number>} */
  const m = {};
  for (const s of statuses) {
    m[s] = (m[s] ?? 0) + 1;
  }
  return m;
}

async function postForgot(i) {
  const res = await fetch(`${base}/api/v1/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `rl-auth-${i}-${Date.now()}@invalid.test` }),
  });
  const retryAfter = res.headers.get("retry-after");
  let bodySnippet = "";
  try {
    const j = await res.json();
    if (j?.error?.code) bodySnippet = j.error.code;
  } catch {
    /* ignore */
  }
  return { status: res.status, retryAfter, bodySnippet };
}

async function postReset(i) {
  const res = await fetch(`${base}/api/v1/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: `fake-token-${i}`,
      newPassword: "DoesntMatter1!",
    }),
  });
  return { status: res.status, retryAfter: res.headers.get("retry-after") };
}

async function getMe() {
  const res = await fetch(`${base}/api/v1/me`, {
    method: "GET",
    headers: cookie ? { cookie } : {},
  });
  return { status: res.status, retryAfter: res.headers.get("retry-after") };
}

async function main() {
  console.log(`
=== Bucomax — suíte RATE LIMIT ===
Base:     ${base}
Strict:   ${strict ? "sim (exige 429 no preset auth)" : "não"}
Auth N:   ${authRequests} (paralelo)
API N:    ${apiRequests} (paralelo) ${cookie ? "" : dim("(ignorado — sem LOAD_TEST_COOKIE)")}
`);

  let exitCode = 0;

  // --- Preset auth: mesmo bucket por IP (forgot + reset compartilham chave rl:auth:IP)
  console.log(`\n--- Preset auth (máx 5/min por IP) — ${authRequests}× paralelo forgot-password ---`);
  const forgot = await Promise.all(Array.from({ length: authRequests }, (_, i) => postForgot(i)));
  const forgotStatuses = forgot.map((x) => x.status);
  console.log("Status:", tally(forgotStatuses));
  const c429a = forgotStatuses.filter((s) => s === 429).length;
  const cRetry = forgot.filter((x) => x.retryAfter).length;
  if (c429a > 0) {
    console.log(green(`429 recebidos: ${c429a} ${dim("(Redis + rate limit ativos)")}`));
    const sample = forgot.find((x) => x.status === 429);
    if (sample?.bodySnippet) console.log(dim(`  corpo erro (amostra): ${sample.bodySnippet}`));
  } else {
    console.log(yellow("Nenhum 429 no preset auth — Redis ausente ou limite desligado (getRedisConnection null)."));
    if (strict) {
      console.log(red("RL_STRICT=1: falha."));
      exitCode = 1;
    }
  }
  if (cRetry > 0) console.log(dim(`Respostas com Retry-After: ${cRetry}`));

  console.log(`\n--- Preset auth — reset-password (token inválido; mede mesmo bucket IP) ---`);
  const reset = await Promise.all(Array.from({ length: Math.min(8, authRequests) }, (_, i) => postReset(i)));
  console.log("Status:", tally(reset.map((x) => x.status)));

  // --- Preset api: por session.user.id
  if (cookie) {
    console.log(`\n--- Preset api (máx 120/min por usuário) — ${apiRequests}× paralelo GET /api/v1/me ---`);
    const me = await Promise.all(Array.from({ length: apiRequests }, () => getMe()));
    const meSt = me.map((x) => x.status);
    console.log("Status:", tally(meSt));
    const c429b = meSt.filter((s) => s === 429).length;
    if (c429b > 0) {
      console.log(green(`429 na API autenticada: ${c429b}`));
    } else {
      console.log(yellow("Nenhum 429 em /me — sem Redis ou taxa abaixo do limite efetivo."));
      if (strict) {
        console.log(red("RL_STRICT=1: esperava 429 na API com N>120."));
        exitCode = 1;
      }
    }
  } else {
    console.log(`\n${dim("Pule: defina LOAD_TEST_COOKIE para testar preset api (120/min por userId).")}`);
  }

  console.log(`
--- SSE (${dim("limite 3 conexões / usuário no Redis — não é o preset rl:sse das chaves rate-limit.ts")}) ---
O contador usa chave sse:conn:\${userId}. Teste manual: várias abas em /api/v1/notifications/stream com sessão.
`);

  console.log("\nFim da suíte rate limit.");
  process.exitCode = exitCode;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
