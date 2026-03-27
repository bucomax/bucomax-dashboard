# Etapas de desenvolvimento

Ordem geral: **todo o backend necessário** (APIs, dados, e-mail, storage) → **frontend** começando por **login e recuperação de senha** → perfil/permissões/convites → shell do produto → jornada clínica → integrações externas.

**Referência de e-mail (layout e cópia):** projeto **kaber.ai** — `src/infrastructure/email/email-templates.ts` (Kaber). No iDoctor: `src/infrastructure/email/email-templates.ts` (marca iDoctor, mesmos tipos de mensagem).

**Variáveis de teste (Resend + R2):** alinhadas ao kaber para desenvolvimento local; valores **apenas em `.env`** (não commitar). Ver `.env.example`.

---

## Status — backend

| Fase | Estado | Descrição |
|------|--------|-----------|
| B0 | ✅ | Bootstrap Next.js, pastas, Docker Postgres, `.env.example` |
| B1 | ✅ | Prisma auth + multi-tenant + migrations + seed |
| B2 | ✅ | NextAuth Credentials + JWT + `/login` |
| B3 | ✅ | Middleware (`/dashboard`) |
| B4 | ✅ | Prisma singleton + `api-response` |
| B5 | ✅ | `/api/v1/health`, `/me`, Scalar + OpenAPI |
| B6 | ✅ | Tenant ativo, `GET /tenants`, admin cria tenant |
| B7 | ✅ | **Resend** + templates HTML (`resend.client`, `email-templates`, `APP_PUBLIC_URL`) |
| B8 | ✅ | Recuperação de senha + **convite / definir senha** (`forgot-password`, `reset-password`, `admin/invites`, tokens Prisma) |
| B9 | ✅ | **Perfil** (`GET/PATCH/DELETE /me`, `POST /me/password`), **`User.deletedAt`**, membros **`/admin/tenants/:id/members`** |
| B10 | ✅ | **Client** (pacientes) + **FileAsset** + **R2 presign**; wizard UI = **F7**; jornada = **B11** |
| B11 | ✅ | Jornada clínica (`CarePathway`, versões, `graphJson`, etapas, `PatientPathway`, transição + stub) |

---

## Status — frontend

| Fase | Estado | Descrição |
|------|--------|-----------|
| F1 | ✅ | **Login** + **esqueci senha** (feature `auth`, `POST /auth/forgot-password`) |
| F2 | ✅ | **Redefinir senha** + **definir senha** (convite) — rotas `/auth/reset-password`, `/auth/invite` · *confirmar e-mail (opcional): ainda não* |
| F3 | ⬜ | **Perfil**: visualizar e atualizar; **permissões** (admin editando outro usuário no tenant) |
| F4 | ⬜ | **Soft delete** (UI + alinhado à API `deletedAt`) |
| F5 | ⬜ | **Admin**: criar conta de usuário → envio de **link de confirmação** (Resend) para o usuário definir senha |
| F6 | ⬜ | Shell: shadcn, sidebar, tema, **tenant switcher** |
| F7 | ⬜ | Wizard **novo paciente** (dados → fluxo → salvar) |
| F8 | ⬜ | Editor XYFlow + ficha / transição de etapa |

---

## Parte 1 — Backend (detalhe)

### B0 — Bootstrap

- Next.js (App Router), TypeScript, ESLint, Tailwind, `src/` + alias `@/*`.
- `packages/prisma`, scripts `db:*`, `docker-compose` Postgres.
- Variáveis: `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.

### B1 — Prisma: núcleo + NextAuth tables

- `User`, `Tenant`, `TenantMembership`; `Account`, `Session`, `VerificationToken`.
- Seed dev.

### B2 — NextAuth (v4)

- Credentials + JWT; callbacks de sessão; `SessionProvider`.

### B3 — Middleware

- Proteção de rotas; rotas públicas de auth e docs.

### B4 — Infra

- Cliente Prisma singleton; respostas JSON padronizadas.

### B5 — API `/api/v1` + Scalar

- Health, me; `public/openapi.json`; `/api-doc` (Scalar handler).

### B6 — RBAC e tenant

- `User.activeTenantId`; `POST /auth/context`; `GET /tenants`; `POST /admin/tenants`; guards.

### B7 — E-mail transacional (Resend)

- **Variáveis:** `RESEND_API_KEY`, `EMAIL_FROM`, `APP_PUBLIC_URL` (links nos e-mails).
- **Cliente:** envio via `resend` (ou SDK oficial), camada `src/infrastructure/email/` (ex.: `send-email.ts`).
- **Templates HTML** (mesmo padrão visual do kaber: layout em tabela, CTA, preheader, footer):
  - confirmação de e-mail (se usar fluxo register);
  - recuperação de senha;
  - **convite / definir senha** (conta criada por admin).
- Implementação: `src/infrastructure/email/email-templates.ts` (espelha estrutura do kaber; marca **iDoctor**).

**Critério de pronto:** envio de teste em dev (ex.: rota interna ou script) usando um template real.

### B8 — Recuperação de senha e convite (API)

- **Modelo de token:** reutilizar padrão seguro (ex.: `VerificationToken` estendido ou tabela `PasswordResetToken` / `UserInviteToken` com `expires`, `usedAt`).
- **Rotas sugeridas:**
  - `POST /api/v1/auth/forgot-password` — body `{ email }`; envia e-mail com link (template reset).
  - `POST /api/v1/auth/reset-password` — body `{ token, password }` (ou `token` na query na página e `password` no POST).
  - `POST /api/v1/admin/users` ou `POST /api/v1/admin/tenants/:id/members` — cria usuário **sem senha** (ou com flag `pendingInvite`); gera token único; **Resend** com link de **definir senha** (template convite).
- **Segurança:** rate limit em forgot-password; não revelar se email existe; tokens com expiração curta (reset ~1h; convite ~48h conforme definir).

**Critério de pronto:** fluxo completo forgot → email → reset; fluxo admin → invite → definir senha.

### B9 — Perfil, soft delete, permissões (API) ✅

- **Soft delete:** `User.deletedAt`; login e JWT ignoram contas deletadas; `DELETE /api/v1/me` + limpeza de `Session` (adapter).
- **Perfil:** `GET/PATCH /api/v1/me`; `POST /api/v1/me/password` (`currentPassword`, `newPassword`).
- **Membros:** `GET /api/v1/admin/tenants/{tenantId}/members`; `PATCH` / `DELETE` `.../members/{userId}` — papel `tenant_admin` | `tenant_user`; não remove/rebaixa último admin (`409`).
- **OpenAPI:** `public/openapi.json` v0.3.0.

**Critério de pronto:** ✅

### B10 — Pacientes + R2 ✅

- **Prisma:** `Client` (nome, phone, `caseDescription`, `documentId`, `deletedAt`) e `FileAsset` (`r2Key` único, metadados, `clientId` opcional).
- **API:** `GET/POST /api/v1/clients`, `GET/PATCH/DELETE /api/v1/clients/{id}` — exige **tenant ativo** (`getActiveTenantIdOr400`).
- **R2:** `POST /api/v1/files/presign` → `uploadUrl` + `key`; `POST /api/v1/files` registra metadados após PUT no bucket (`key` validado por prefixo `tenants/{tenantId}/`).
- **Variáveis:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`; opcional `R2_PUBLIC_URL` para URL pública de leitura.
- **Wizard** (passos dados → fluxo → salvar com `PatientPathway`): **F7** + **B11** quando existir modelo de jornada.

**Critério de pronto (backend B10):** ✅

### B11 — Jornada clínica ✅

- **Prisma:** `CarePathway`, `PathwayVersion` (`graphJson`, `published`), `PathwayStage` (materializado na publicação), `PatientPathway`, `StageTransition` (`dispatchStub` JSON).
- **API:** `GET/POST /api/v1/pathways`; `GET/PATCH/DELETE /api/v1/pathways/{id}`; `POST .../versions`; `POST .../versions/{versionId}/publish`; `GET/POST /api/v1/patient-pathways`; `GET .../{id}`; `POST .../{id}/transition`.
- **OpenAPI:** `public/openapi.json` v0.5.0.
- **UI:** editor XYFlow + ficha = **F8**; wizard paciente = **F7**.

**Critério de pronto (backend B11):** ✅

---

## Parte 2 — Frontend (detalhe)

### Padrão de features (obrigatório para novas telas)

- Guia completo: **[FRONTEND-FEATURES.md](./FRONTEND-FEATURES.md)** — como criar uma feature (`src/features/<nome>/app/…`), o que vai em `pages/`, `hooks/`, `services`, e como deixar **`src/app/.../page.tsx`** só como rota fina.
- Regra do Cursor: `.cursor/rules/frontend-feature.mdc`.

### F1 — Login e recuperação de senha

- Telas **login** (já existe base), **esqueci minha senha**, **e-mail enviado** (feedback).
- Integração com `POST /auth/forgot-password` e fluxo de **nova senha** (F2).

### F2 — Páginas de token (links dos e-mails)

- ` /auth/reset-password?token=...` (ou rota equivalente App Router).
- ` /auth/invite?token=...` — **definir senha** primeira vez.
- Opcional: ` /auth/verify-email?token=...` se houver confirmação de e-mail.

### F3 — Perfil e permissões

- **Perfil:** ver dados, editar, atualizar senha.
- **Admin editando outro usuário:** tela ou modal no tenant para alterar **papel** (`tenant_admin` / `tenant_user`) e dados permitidos pela API.

### F4 — Soft delete

- Ações de “desativar” / “remover” conforme API (soft delete); listagens filtram.

### F5 — Admin cria usuário + e-mail confirmação

- Formulário de convite (email + papel); após sucesso, mensagem **“link enviado”**; alinhado ao fluxo B8 + template convite.

### F6 — Shell do produto

- shadcn, sidebar, tema, **tenant switcher** (já apoiado em B6).

### F7 — Wizard novo paciente

- Fluxo multi-step; chama APIs B10.

### F8 — Jornada no canvas

- XYFlow + ficha + transição (B11).

---

## Integrações (I1–I3)

| Fase | Conteúdo |
|------|----------|
| I1 | WhatsApp (dispatch real) |
| I2 | IA + webhooks |
| I3 | Filas / retries |

---

## Checklist rápido

**Backend:** B0–B11 ✅  

**Frontend:** F1–F2 ✅ · F3–F8 ⬜  

**Integrações:** I1–I3 ⬜  

---

## Comandos úteis

```bash
npm install
cp .env.example .env
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

---

## Próximo passo imediato

**Frontend produto:** **F6** (shell shadcn + tenant switcher) → **F7** (wizard novo paciente: `POST /clients` + arquivos B10 + opcional `POST /patient-pathways`) → **F8** (editor XYFlow + `pathways` / `publish` + transição).

Em paralelo: **F3** (perfil / membros) ou **integrações I1** (WhatsApp real no lugar do stub).
