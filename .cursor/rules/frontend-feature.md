# Regra: frontend-feature

Aplica-se a arquivos em `src/features/**/*` e `src/app/**/page.tsx`.

## Estrutura de uma feature

```
src/features/<nome>/app/
  components/   → componentes React da feature
  hooks/        → hooks customizados (formulários, estado, orquestração)
  pages/        → páginas compostas (importadas pela page.tsx da rota)
  services/     → funções HTTP (apiClient) — sem tipos inline
  types/        → tipos exclusivos da feature (barrel api.ts reexportando @/types/api/)
  utils/        → schemas Zod, helpers
```

Use `admin/` em vez de `app/` para features de back-office.

Referência viva: `src/features/auth/app/`, `src/features/clients/app/`.

## Rotas Next.js (App Router)

`src/app/<rota>/page.tsx` deve ser **fina**: só importa a página de `features/.../pages/` e exporta.

```tsx
// src/app/(dashboard)/clients/page.tsx
import { ClientsPage } from "@/features/clients/app/pages/clients-page";
export default function Page() { return <ClientsPage />; }
```

**Sem** lógica de negócio, formulários grandes ou fetch na `page.tsx` da rota.

## Responsabilidades

- **Services:** HTTP (`apiClient`), parsing de `ApiEnvelope` — tipos de `@/types/api/<domínio>-v1.ts`.
- **Hooks:** formulários (react-hook-form), estado, orquestração; chamam services.
- **Components:** UI + hooks + props tipadas — importam tipos de `types/` da feature ou `@/types/`.
- **Pages (feature):** composição (shell, Suspense, títulos), não reimplementar serviços.

## Componentes compartilhados

| O quê | Onde |
|-------|------|
| UI (shadcn) | `@/shared/components/ui/` |
| Formulários (RHF) | `@/shared/components/forms/` |
| Layouts | `@/shared/components/layout/` (AppShell, DashboardPage, AuthLayout) |
| Modal padrão | `StandardDialogContent` em `@/shared/components/ui/dialog` |
| Cliente HTTP | `@/lib/api/http-client` |
| Envelope API | `@/shared/types/api/v1` |
| Feedback | `@/shared/components/feedback/` |

## Debounce

- Usar `useDebouncedState` com `{ trim: true, delayMs: DEBOUNCE_MS.search }` para filtros com input de busca.
- Usar `useDebouncedCallback` para executar função após pausa (ex.: rascunho).
- Fonte única: `src/shared/hooks/use-debounce.ts`. **Não** reimplementar com `setTimeout`.

## Toasts

- `apiClient` interceptor já exibe `toast.error` em falhas HTTP — **não duplicar** no catch.
- `skipErrorToast: true` no config para chamadas auxiliares (breadcrumb, prefetch).
- Manter `toast.error` para validação local (formulário) e mensagens que não vêm de `apiClient`.
- Sucesso: `toastSuccessMessage` no config da requisição.

## Nomenclatura

- Arquivos: **kebab-case**.
- Componentes React: **PascalCase**.
- Tipos: em `types/` da feature ou `src/types/` se globais.
