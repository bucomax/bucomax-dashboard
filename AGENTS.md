<!-- Next.js 16: consulte a documentação em https://nextjs.org/docs antes de assumir APIs herdadas de versões antigas. -->

# AGENTS

Instruções para assistentes de código neste repositório.

## Documentação

- Arquitetura e modelo de dados (**§8**): [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Escopo de produto: [`docs/PRODUCT-SCOPE.md`](docs/PRODUCT-SCOPE.md)
- Regras consolidadas Bucomax: [`docs/bucomax/business-logic.md`](docs/bucomax/business-logic.md)
- Etapas de dev (backend primeiro, NextAuth): [`docs/DEV-PHASES.md`](docs/DEV-PHASES.md)
- Doc de API (Scalar + OpenAPI): [`docs/API-DOCS.md`](docs/API-DOCS.md)

## Regras do Cursor

Regras persistentes em [`.cursor/rules/`](.cursor/rules/) (`.mdc`):

| Arquivo | Uso |
|---------|-----|
| `core.mdc` | Sempre — docs, escopo, multi-tenant, RBAC, LGPD |
| `multi-tenant-journey.mdc` | Sempre — pathway, etapas, transição, bundle, dispatch, IA |
| `solid-clean-code.mdc` | Sempre — SOLID, clean code, testes, tipos |
| `clean-architecture.mdc` | Sempre — camadas, ports, DTOs, config |
| `backend-api.mdc` | `app/api/**` — v1, Zod, auth, webhooks, erros HTTP |
| `application-layer.mdc` | `src/application`, `src/domain` — use cases, transações, ports |
| `infrastructure.mdc` | Infra — Prisma, GCS, HTTP, webhooks entrada |
| `frontend-dashboard.mdc` | `.tsx` — layout, Query, telas jornada/paciente |
| `code-organization.mdc` | Sempre — `src/types/`, `src/lib/utils/`, sem tipos soltos em rotas/componentes |
| `http-services-api-types.mdc` | `src/types/api/**`, `**/*.service.ts` — DTOs em `types/api`, services só HTTP |

## Skills do projeto

Em [`.cursor/skills/`](.cursor/skills/):

| Skill | Tema |
|-------|------|
| `stage-transition` | Transição de etapa, bundle de documentos, dispatch |
| `external-integrations` | WhatsApp, IA, webhooks |
| `docs-alignment` | Manter docs alinhadas ao código |


## Regras do Claude Code

Regras em [`.claude/rules/`](.claude/rules/) (`.md`):

| Arquivo | Uso |
|---------|-----|
| `core.md` | Sempre — docs, escopo, multi-tenant, RBAC, LGPD |
| `multi-tenant-journey.md` | Sempre — pathway, etapas, transição, bundle, dispatch, IA |
| `solid-clean-code.md` | Sempre — SOLID, clean code, testes, tipos |
| `clean-architecture.md` | Sempre — camadas, ports, DTOs, config |
| `backend-api.md` | `app/api/**` — v1, Zod, auth, webhooks, erros HTTP |
| `application-layer.md` | `src/application`, `src/domain` — use cases, transações, ports |
| `infrastructure.md` | Infra — Prisma, GCS, HTTP, webhooks entrada |
| `frontend-feature.md` | `src/features/**` — features, páginas finas, services/hooks |
| `code-organization.md` | Sempre — `src/types/`, `src/lib/utils/`, sem tipos soltos |
| `http-services-api-types.md` | `src/types/api/**`, `**/*.service.ts` — DTOs, services HTTP |

## Skills do Claude Code

Em [`.claude/skills/`](.claude/skills/):

| Skill | Tema |
|-------|------|
| `stage-transition` | Transição de etapa, bundle de documentos, dispatch |
| `external-integrations` | WhatsApp, IA, webhooks |
| `docs-alignment` | Manter docs alinhadas ao código |
| `patient-portal` | Portal do paciente, OTP, magic link, file review |
| `pathway-editor` | Editor visual @xyflow/react, graphJson, publicação |
| `notifications-system` | Notificações in-app, BullMQ, SSE, preferências |
| `dashboard-kanban` | Dashboard, Kanban, SLA, relatórios |