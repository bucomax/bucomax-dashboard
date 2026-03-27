# iDoctor

Plataforma em construção: dashboard **multi-tenant**, **RBAC**, **PostgreSQL**, **Next.js**, **Tailwind**, **subdomínios por tenant** e **Cloudflare R2**.

## Documentação do produto

- **[Arquitetura](docs/ARCHITECTURE.md)** — stack, multi-tenant, modelo §8.
- **[Escopo](docs/PRODUCT-SCOPE.md)** — fronteiras e jornada.
- **[Etapas de desenvolvimento](docs/DEV-PHASES.md)** — backend primeiro (Prisma, NextAuth, `/api/v1`).
- **[API (Scalar)](docs/API-DOCS.md)** — OpenAPI + UI.

## Next.js (oficial)

Projeto criado com [`create-next-app`](https://nextjs.org/docs/getting-started/installation) (`npx create-next-app@latest`): **Next.js 16**, **App Router**, **TypeScript**, **Tailwind CSS**, **ESLint**, pasta **`src/`**, alias **`@/*`**.

### Desenvolvimento

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Edite `src/app/page.tsx` para ver hot reload.

### Prisma (monorepo)

Schema em `packages/prisma/`. Com `DATABASE_URL` no `.env`:

```bash
npm run db:migrate
npm run db:seed
```

### Cursor

Regras em [`.cursor/rules/`](.cursor/rules/), índice em [`AGENTS.md`](AGENTS.md).

### Deploy

Documentação: [Deploying](https://nextjs.org/docs/app/building-your-application/deploying).
