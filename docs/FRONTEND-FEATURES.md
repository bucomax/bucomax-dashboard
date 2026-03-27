# Frontend — como criar uma nova feature

Padrão **feature-based**: cada domínio de telas fica em `src/features/<nomeDaFeature>/`, com contexto **`app/`** (usuário final / área logada comum) ou **`admin/`** (back-office), espelhando a ideia do projeto de referência (Vize): componentes, hooks, páginas de composição, serviços HTTP e tipos **dentro da feature**; o **App Router** só expõe rotas finas.

---

## Onde fica o quê

| Pasta | Conteúdo |
|--------|-----------|
| **`app/<contexto>/components/`** | UI pura ou containers que recebem dados/handlers por props. |
| **`app/<contexto>/hooks/`** | Um ou mais hooks (`useXxx`) — formulário, estado, chamadas via services. |
| **`app/<contexto>/pages/`** | “Páginas” da feature: só **composição** (layout + suspense + container/form), **sem** lógica de negócio pesada. |
| **`app/<contexto>/services/`** | Chamadas a `fetch` / `apiClient` (Axios), parsing do envelope `{ success, data \| error, meta }`. |
| **`app/<contexto>/types/`** | Tipos exclusivos da feature (`auth.ts`, `components.ts`, etc.). |
| **`app/<contexto>/utils/`** | Schemas Zod (`schemas.ts`) e helpers só da feature. |

**Contexto** = `app` ou `admin` dentro de `features/<nome>/`.

**Compartilhado (não é feature):**

- `src/components/` — formulários genéricos (`FormInput`, `FormPassword`…), providers.
- `src/lib/api/` — `http-client`, envelope de API.
- `src/types/api/v1.ts` — tipos do envelope de resposta.

---

## Passo a passo — nova feature

1. **Nome da pasta** em `camelCase` ou `kebab-case` consistente com o restante do repo (ex.: `auth`, `patients`).

2. **Criar a árvore mínima** (exemplo contexto `app`):

   ```
   src/features/<nome>/app/
   ├── components/
   ├── hooks/
   ├── pages/
   ├── services/
   ├── types/
   └── utils/
   ```

3. **Schemas Zod** em `utils/schemas.ts` (ou alinhar com validadores já expostos em `@/lib/validators/...` se forem os mesmos do backend).

4. **Tipos** em `types/` — preferir `z.infer<typeof schema>` para formulários e DTOs.

5. **Services** — funções assíncronas que chamam `/api/v1/...`, tratam `ApiSuccessEnvelope` / `ApiErrorEnvelope` (ver `src/lib/api/envelope.ts`).

6. **Hooks** — encapsulam `useForm`, `useRouter`, estado local e chamam **services** (não importar `fetch` direto no componente de UI se puder ficar no hook ou service).

7. **Componentes** — recebem props ou usam só o hook da feature; evitar lógica duplicada.

8. **`pages/`** — exportar componentes nomeados (`XxxPage`) que montam layout (`AuthPageShell`, shell do dashboard, etc.) + `Suspense` onde houver `useSearchParams` / client boundary.

9. **Rota Next.js** — em `src/app/.../page.tsx`:

   ```tsx
   import { MinhaPage } from "@/features/<nome>/app/pages/minha-page";

   export default function Page() {
     return <MinhaPage />;
   }
   ```

   Nada de regra de negócio na `page.tsx` da rota.

---

## Convenções rápidas

- **Páginas de rota** (`src/app/.../page.tsx`): apenas importar a página da feature e exportar `default`.
- **Imports** explícitos (sem barrel `index.ts` na feature, salvo se o time decidir o contrário).
- **API:** sempre usar `jsonSuccess` / `jsonError` nas rotas; no client, tipar com `ApiEnvelope<T>` quando necessário.
- **Nomes:** arquivos em **kebab-case** (`use-forgot-password-form.ts`, `forgot-password-page.tsx`); componentes React em **PascalCase** no código.

---

## Referência no repositório

- Feature **`auth`** (`src/features/auth/app/`) — fluxos esqueci senha, convite, redefinir senha, formulários e serviços alinhados ao padrão acima.

---

## Próximos passos (opcional)

- i18n por feature (`src/features/<nome>/i18n/<locale>.json`) quando o projeto ligar o pacote de traduções.
- Testes colados ao componente ou hook (`*.test.tsx`), conforme política do time.
