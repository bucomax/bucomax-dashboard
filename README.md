# Bucomax

Painel clínico **multi-tenant** para orquestrar a **jornada do paciente**: fluxos por etapas (editor visual), Kanban, SLA, arquivos em nuvem e equipe com papéis definidos.

---

## Stack

| Camada | Tecnologias |
|--------|-------------|
| App | **Next.js 16** (App Router), **React**, **TypeScript** |
| UI | **Tailwind CSS**, componentes com **Base UI** |
| Dados | **PostgreSQL**, **Prisma** (`packages/prisma`) |
| Auth | **NextAuth** |
| Arquivos | **Cloudflare R2** (URLs assinadas) |
| Filas / jobs | **BullMQ** + **Redis** (quando configurado) |

---

## Começar

1. Copie variáveis de ambiente: `.env.example` → `.env` (inclua `DATABASE_URL`, segredos NextAuth, R2 se for usar uploads).
2. Instale e suba o banco:

```bash
npm install
npm run db:migrate
npm run db:seed   # opcional — dados de desenvolvimento
npm run dev
```

3. Abra [http://localhost:3000](http://localhost:3000).

Comandos úteis: `npm run db:studio`, `npm run build`, `npm run lint`.

---

## Documentação

| Doc | Conteúdo |
|-----|----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Camadas, multi-tenant, RBAC, modelo de dados |
| [docs/PRODUCT-SCOPE.md](docs/PRODUCT-SCOPE.md) | Produto, jornada, limites do escopo |
| [docs/DEV-PHASES.md](docs/DEV-PHASES.md) | Ordem sugerida de implementação |
| [docs/API-DOCS.md](docs/API-DOCS.md) | API REST v1 (Scalar + `public/openapi.json`) |
| [AGENTS.md](AGENTS.md) | Guia para assistentes / regras do repositório |

Regras do Cursor: [`.cursor/rules/`](.cursor/rules/).

---

## Estrutura (resumo)

- `src/app/` — rotas App Router e handlers `/api/v1/*`
- `src/features/` — telas e serviços por domínio (clientes, jornadas, configurações…)
- `src/lib/`, `src/types/` — utilitários e contratos compartilhados
- `packages/prisma/` — schema e migrations

---

## Deploy

Build de produção: `npm run build` → `npm run start`. Orientações gerais: [Next.js — Deploying](https://nextjs.org/docs/app/building-your-application/deploying).

---

*Bucomax — da entrada do paciente ao acompanhamento por etapas, com um único painel por clínica (tenant).*
