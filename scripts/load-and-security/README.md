# Carga, stampede e segurança (fora da suíte unitária)

Ferramentas operacionais em Node + **autocannon** (`fetch` nos probes). **Não** rodam com `npm test`.

## Pré-requisitos

- App no ar: `npm run dev` ou `npm run start` (para carga realista prefira `start` após `build`).
- **Redis** ligado para rate limit (`429`) nos presets `auth` e `api` — sem Redis os limites são ignorados no código.
- Node 18+.

## Comandos npm

| Comando | O quê |
|---------|--------|
| `npm run load:test` | Carga moderada (health; opcional `/me` com cookie). |
| `npm run load:heavy` | Carga **pesada** e longa (defaults agressivos). |
| `npm run load:stampede` | **Pico** no mesmo URL (efeito “manada” / origem sem cache HTTP). |
| `npm run security:probe` | Smoke de segurança (401, payloads, etc.). |
| `npm run security:rate-limit` | Foco em **429** auth (IP) e api (usuário). |
| `npm run stress:all` | Ordem: stampede → pesada → probes → rate limit. **Spinner + tempo (stderr)** por etapa; `STRESS_SPIN_MS` (default 250) altera a velocidade da animação. |

## Variáveis comuns

`LOAD_TEST_BASE_URL` (default `http://127.0.0.1:3000`), `LOAD_TEST_COOKIE` (sessão NextAuth copiada do navegador).

### Carga moderada (`load:test`)

Ver `run-load.mjs` — `LOAD_TEST_CONNECTIONS`, `LOAD_TEST_DURATION_SEC`, `LOAD_TEST_PIPELINING`.

### Carga pesada (`load:heavy`)

| Variável | Default | |
|----------|---------|--|
| `HEAVY_CONNECTIONS` | 120 | |
| `HEAVY_DURATION_SEC` | 90 | |
| `HEAVY_PIPELINING` | 1 | |
| `HEAVY_FAIL_ON_ERRORS` | 0 | `1` = exit 1 se errors/timeouts no autocannon |

### Stampede (`load:stampede`)

Simula muitos clientes no **mesmo path** ao mesmo tempo (no projeto quase não há cache de API; o efeito é pressionar **Prisma** em `/api/v1/health`).

| Variável | Default | |
|----------|---------|--|
| `STAMPEDE_CONNECTIONS` | 250 | |
| `STAMPEDE_DURATION_SEC` | 5 | |
| `STAMPEDE_PATH` | `/api/v1/health` | |
| `STAMPEDE_PIPELINING` | 1 | |
| `STAMPEDE_FAIL_ON_ERRORS` | 0 | |

Com `LOAD_TEST_COOKIE` e `STAMPEDE_PATH=/api/v1/me` você também stressa **auth + rate limit api** — use com cuidado.

### Rate limit (`security:rate-limit`)

| Variável | Default | |
|----------|---------|--|
| `RL_AUTH_REQUESTS` | 30 | paralelo `POST /auth/forgot-password` |
| `RL_API_REQUESTS` | 130 | paralelo `GET /api/v1/me` (precisa cookie) |
| `RL_STRICT` | 0 | `1` = falha se não aparecer 429 onde o Redis deveria limitar |

Exemplo CI / staging com Redis:

```bash
LOAD_TEST_BASE_URL=https://staging.example.com \
RL_STRICT=1 \
npm run security:rate-limit
```

Com cookie para testar limite **120/min por usuário**:

```bash
LOAD_TEST_COOKIE='next-auth.session-token=...' \
RL_API_REQUESTS=150 \
npm run security:rate-limit
```

### SSE

O stream de notificações usa contador Redis `sse:conn:<userId>` (máx. 3). Não há script automatizado; teste manual com várias abas autenticadas em `/api/v1/notifications/stream`.

## Avisos

- **Não** rode `stress:all` em produção sem acordo.
- Carga em `/api/v1/health` executa `SELECT 1` por requisição — observar pool do banco e CPU.
- `RL_STRICT=1` falha se Redis não estiver configurado (comportamento esperado para validar infra).

## Códigos de saída

- `security:probe`: **1** se alguma sonda falhar.
- `security:rate-limit`: **1** se `RL_STRICT=1` e limites não forem observados.
- `run-battery.mjs`: propaga o primeiro código não zero.
