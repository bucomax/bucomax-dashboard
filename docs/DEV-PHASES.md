# Etapas de desenvolvimento

Ordem sugerida: **backend primeiro** (dados, **NextAuth**, APIs), depois frontend do dashboard, depois jornada clínica e integrações.

---

## Status atual (marque ao concluir)

| Fase | Estado | Notas |
|------|--------|--------|
| B0 | 🔄 em andamento | Scaffold Next.js + pastas `src/*` |
| B1 | ⬜ | Migration inicial Postgres |
| B2 | ⬜ | NextAuth Credentials + JWT callbacks |
| B3 | ⬜ | Middleware `/dashboard` |
| B4 | ⬜ | Prisma singleton + `api-response` |
| B5 | ⬜ | `/api/v1/health`, `/me`, Scalar + `openapi.json` |
| B6 | ⬜ | Contexto tenant + admin |
| B7 | ⬜ | `Client` (wizard documentado no PRODUCT-SCOPE) + R2 |
| B8 | ⬜ | Pathway, XYFlow, transição |

*Atualize a coluna **Estado** (`✅` / `🔄` / `⬜`) conforme o time avança.*

---

## Visão geral

| Bloco | Fases | Foco |
|-------|-------|------|
| **Backend** | B0–B8 | Next.js, Prisma, **NextAuth**, multi-tenant, `/api/v1`, jornada §8 |
| **Frontend** | F1–F5 | Layout, auth, wizard novo paciente, jornada |
| **Integrações** | I1–I3 | WhatsApp, IA, R2 |

---

## Backend — ordem de execução

### B0 — Bootstrap do repositório

- Next.js (App Router), TypeScript, ESLint, **Tailwind** (base para shadcn depois).
- Monorepo: `packages/prisma` com `schema.prisma`; scripts `db:generate` / `db:migrate`.
- Variáveis: `DATABASE_URL`, `DIRECT_URL` (Postgres), `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.
- Pastas: `src/application`, `src/infrastructure`, `src/types`, `src/lib/utils`, `src/lib/constants`, `app/api/v1` (em `src/app/api/v1` com `src/` habilitado).
- Opcional local: `docker-compose.yml` com Postgres.

**Critério de pronto:** `npm run dev` sobe; `npm run db:migrate` aplica migration inicial (com DB configurado).

---

### B1 — Prisma: núcleo auth + multi-tenant

- `User` (email, `passwordHash`, `globalRole`), `Tenant`, `TenantMembership`.
- Tabelas **NextAuth** + **Prisma Adapter**: `Account`, `Session`, `VerificationToken`.
- **Seed** de desenvolvimento: usuário + tenant + membership (para login imediato).

**Critério de pronto:** `prisma migrate` ok; `npm run db:seed` cria dados de teste.

---

### B2 — NextAuth (v4)

- `next-auth`, `@next-auth/prisma-adapter`, `bcryptjs`.
- `src/lib/auth/auth-options.ts` → `authOptions`; `app/api/auth/[...nextauth]/route.ts`.
- **Credentials** + **JWT** session; callbacks com `userId`, `globalRole` na sessão.
- Helper `auth()` / `getServerSession` para Route Handlers.

**Critério de pronto:** login na rota `/login` com usuário seed; sessão com claims mínimos.

---

### B3 — Middleware

- Proteger `/dashboard/*`; público: `/`, `/login`, `/api/auth`, `/api-doc`, `/openapi.json`, assets.

**Critério de pronto:** anônimo não acessa dashboard.

---

### B4 — Infra mínima

- `src/infrastructure/database/prisma.ts` (singleton).
- `src/lib/api-response.ts` — `{ data }` / `{ error, code }`.

---

### B5 — API `/api/v1` + Scalar

- `GET /api/v1/health`, `GET /api/v1/me` (autenticado).
- `public/openapi.json` + `/api-doc` com `@scalar/nextjs-api-reference`.
- Decisão: **Opção A** — auth via cookie de sessão NextAuth nos handlers.

**Critério de pronto:** rotas documentadas no OpenAPI; Scalar abre.

---

### B6 — RBAC e tenant

- `POST /api/v1/auth/context`, `GET /api/v1/tenants`, `POST /api/v1/admin/tenants` (super_admin).

---

### B7 — Pacientes + R2

- CRUD `Client` (campos: WhatsApp, nome, `caseDescription`, …).
- Wizard **dados → fluxo → salvar** (ver PRODUCT-SCOPE); endpoint único `onboard` ou duas chamadas no final.
- R2 presign + metadados `File`.

---

### B8 — Jornada clínica

- `CarePathway`, templates, `PathwayVersion.graphJson`, `PathwayStage`, `PatientPathway`, transição, dispatch stub.

---

## Frontend

| Fase | Conteúdo |
|------|----------|
| **F1** | shadcn + sidebar + tema |
| **F2** | Login/logout + `SessionProvider` |
| **F3** | Shell dashboard + tenant switcher (pós-B6) |
| **F4** | Wizard **novo paciente** (dados → fluxo → salvar) |
| **F5** | Editor XYFlow + ficha / transição de etapa |

---

## Integrações

| Fase | Conteúdo |
|------|----------|
| **I1** | WhatsApp (dispatch real) |
| **I2** | IA + webhooks |
| **I3** | Filas / retries |

---

## Checklist rápido — backend

- [ ] B0 Bootstrap  
- [ ] B1 Prisma + NextAuth tables + seed  
- [ ] B2 NextAuth Credentials + JWT  
- [ ] B3 Middleware  
- [ ] B4 Infra + api-response  
- [ ] B5 `/api/v1` + Scalar + openapi  
- [ ] B6 Tenant context + admin  
- [ ] B7 Client + wizard + R2  
- [ ] B8 Pathway + transição  

---

## Comandos úteis (após scaffold)

```bash
npm install
cp .env.example .env   # editar DATABASE_URL e NEXTAUTH_*
docker compose up -d     # se usar Postgres local
npm run db:migrate
npm run db:seed
npm run dev
```

---

*Próximo passo imediato: **B0 → B2** + seed para login funcional.*
