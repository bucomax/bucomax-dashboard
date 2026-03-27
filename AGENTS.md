<!-- Next.js 16: consulte a documentação em https://nextjs.org/docs antes de assumir APIs herdadas de versões antigas. -->

# AGENTS

Instruções para assistentes de código neste repositório.

## Documentação

- Arquitetura e modelo de dados (**§8**): [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Escopo de produto: [`docs/PRODUCT-SCOPE.md`](docs/PRODUCT-SCOPE.md)
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
| `infrastructure.mdc` | Infra — Prisma, R2, HTTP, webhooks entrada |
| `frontend-dashboard.mdc` | `.tsx` — layout, Query, telas jornada/paciente |
| `code-organization.mdc` | Sempre — `src/types/`, `src/lib/utils/`, sem tipos soltos em rotas/componentes |

## Skills do projeto

Em [`.cursor/skills/`](.cursor/skills/):

| Skill | Tema |
|-------|------|
| `stage-transition` | Transição de etapa, bundle de documentos, dispatch |
| `external-integrations` | WhatsApp, IA, webhooks |
| `docs-alignment` | Manter docs alinhadas ao código |
