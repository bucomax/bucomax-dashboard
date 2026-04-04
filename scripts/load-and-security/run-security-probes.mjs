#!/usr/bin/env node
/**
 * Sondagens de segurança “caixa-preta” — não substitui pentest nem scanner profissional.
 * Verifica respostas esperadas para ausência de auth, inputs malformados e limitação de taxa (se Redis ativo).
 *
 * Uso:
 *   LOAD_TEST_BASE_URL=http://127.0.0.1:3000 npm run security:probe
 *
 * Opcional — tenant slug real para rotas públicas do portal (somente smoke):
 *   LOAD_TEST_TENANT_SLUG=meu-clinic npm run security:probe
 */

import { getBaseUrl } from "./lib/base-url.mjs";

const base = getBaseUrl();
const tenantSlug = process.env.LOAD_TEST_TENANT_SLUG?.trim() || "probe-tenant";

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

/** @type {{ name: string; fn: () => Promise<{ ok: boolean; detail: string }> }[]} */
const probes = [];

let failed = 0;

function add(name, fn) {
  probes.push({ name, fn });
}

/** Sem vazamento / erro genérico: rejeita 500/502; 503 = serviço indisponível (ex.: reset por e-mail não configurado). */
function isAcceptableServerBehavior(status) {
  return status !== 500 && status !== 502;
}

add("GET /api/v1/health responde (200) sem credenciais", async () => {
  const res = await fetch(`${base}/api/v1/health`, { method: "GET" });
  const ok = res.status === 200;
  return { ok, detail: `status ${res.status}` };
});

add("GET /api/v1/me sem sessão → 401", async () => {
  const res = await fetch(`${base}/api/v1/me`, { method: "GET" });
  const ok = res.status === 401;
  return { ok, detail: `status ${res.status} (esperado 401)` };
});

add("GET /api/v1/clients sem sessão → 401", async () => {
  const res = await fetch(`${base}/api/v1/clients`, { method: "GET" });
  const ok = res.status === 401;
  return { ok, detail: `status ${res.status} (esperado 401)` };
});

add("GET /api/v1/admin/tenants sem sessão → 401", async () => {
  const res = await fetch(`${base}/api/v1/admin/tenants`, { method: "GET" });
  const ok = res.status === 401;
  return { ok, detail: `status ${res.status} (esperado 401)` };
});

add("GET /api/v1/pathways sem sessão → 401", async () => {
  const res = await fetch(`${base}/api/v1/pathways`, { method: "GET" });
  const ok = res.status === 401;
  return { ok, detail: `status ${res.status} (esperado 401)` };
});

add("Bearer inválido não deve autenticar em /api/v1/me (401)", async () => {
  const res = await fetch(`${base}/api/v1/me`, {
    method: "GET",
    headers: { Authorization: "Bearer eyJhbGciOiJub25lIn0.e30.invalid" },
  });
  const ok = res.status === 401;
  return { ok, detail: `status ${res.status}` };
});

add("POST /api/v1/auth/forgot-password corpo não-JSON → 400 ou 503", async () => {
  const res = await fetch(`${base}/api/v1/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "not-json",
  });
  /** Com Resend ativo: 400. Sem e-mail configurado: rota retorna 503 antes de validar o body. */
  const ok = res.status === 400 || res.status === 503;
  return {
    ok,
    detail: `status ${res.status} ${dim("(400 = JSON inválido; 503 = reset por e-mail desligado no ambiente)")}`,
  };
});

add("POST /api/v1/auth/context sem sessão → 401", async () => {
  const res = await fetch(`${base}/api/v1/auth/context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId: "cuid_fake_xxxxxxxxxxxxxxxx" }),
  });
  const ok = res.status === 401;
  return { ok, detail: `status ${res.status}` };
});

add("GET com segmento de path suspeito não deve vazar stack (4xx, não 5xx)", async () => {
  const res = await fetch(`${base}/api/v1/clients/../../../`, { method: "GET" });
  const ok = res.status < 500;
  return { ok, detail: `status ${res.status}` };
});

add("Query com aspas em clients (sem auth ainda 401 — não deve 500)", async () => {
  const res = await fetch(`${base}/api/v1/clients?search=' OR '1'='1`, { method: "GET" });
  const ok = res.status === 401 || (res.status >= 400 && res.status < 500);
  return { ok, detail: `status ${res.status}` };
});

add("POST forgot-password — corpo grande (sem 500/502 inesperado)", async () => {
  const big = "a".repeat(Math.min(Number(process.env.LOAD_TEST_LARGE_BYTES ?? 200_000), 2_000_000));
  const res = await fetch(`${base}/api/v1/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `${big}@test.local` }),
  });
  const ok = isAcceptableServerBehavior(res.status);
  return {
    ok,
    detail: `status ${res.status} ${dim("(4xx/413/422/503 OK; 503 = e-mail não configurado)")}`,
  };
});

add("POST public patient exchange — body inválido → 4xx (não 5xx)", async () => {
  const res = await fetch(`${base}/api/v1/public/patient-portal/${encodeURIComponent(tenantSlug)}/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const ok = res.status < 500;
  return { ok, detail: `status ${res.status} ${dim("(tenant pode ser inexistente — importa não ser 5xx)")}` };
});

add("Rate limit auth: sequência rápida em forgot-password (sem 500/502; 429 se Redis)", async () => {
  const attempts = 12;
  const statuses = [];
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(`${base}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `load-${i}@example.com` }),
    });
    statuses.push(res.status);
  }
  const any429 = statuses.includes(429);
  const acceptable = statuses.every((s) => isAcceptableServerBehavior(s));
  return {
    ok: acceptable,
    detail: `statuses: ${[...new Set(statuses)].join(",")} ${any429 ? "(429 visto)" : dim("(sem 429 — Redis ausente ou limite alto)")} ${dim("503 = reset por e-mail desligado")}`,
  };
});

async function main() {
  console.log(`
=== Bucomax — sondagens de segurança (smoke) ===
Base: ${base}
Tenant slug (público): ${tenantSlug}
`);

  for (const { name, fn } of probes) {
    try {
      const { ok, detail } = await fn();
      if (ok) {
        console.log(`${green("PASS")} ${name} — ${detail}`);
      } else {
        failed++;
        console.log(`${red("FAIL")} ${name} — ${detail}`);
      }
    } catch (e) {
      failed++;
      console.log(`${red("FAIL")} ${name} — exceção: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(`\nFalhas: ${failed}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
