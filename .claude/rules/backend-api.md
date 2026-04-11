# Regra: backend-api

Aplica-se a arquivos em `src/app/api/**/*.ts`.

## Formato dos handlers

1. Parse body com try/catch ou `safeParse`.
2. **Zod** para validação na borda; schemas importados de `src/lib/validators/<domínio>.ts`.
3. Chamar **um** use case ou query; mapear resultado para resposta padronizada.
4. Tipos de request/response em `src/types/api/` — **não** declarar `interface` no `route.ts`.

## Envelope de resposta

```typescript
// Sucesso
jsonSuccess(data, init?)  // { success: true, data, meta: { timestamp } }

// Erro
jsonError(code, message, status, details?)  // { success: false, error: { code, message, details? }, meta }
```

Helpers em `src/lib/api-response.ts`. Tipos em `src/lib/api/envelope.ts`.

## Fluxo padrão de autenticação

```typescript
const { session, response: authErr } = await requireSessionOr401(request);
if (authErr) return authErr;

const { tenantId, response: tenantErr } = await getActiveTenantIdOr400(session!, request);
if (tenantErr) return tenantErr;

const memberErr = await assertActiveTenantMembership(session!, tenantId!, request);
if (memberErr) return memberErr;
```

Guards em `src/lib/auth/guards.ts`.

## Contrato REST

- Prefixo `/api/v1`; recursos: `pathways`, `clients`, `patient-pathways`, `files`, `notifications`, `webhooks`.
- Versionamento: breaking changes → `/v2` no futuro; não alterar contrato publicado sem changelog.

## Rotas admin

- `/api/v1/admin/*`: apenas `super_admin` — usar `superAdminOr403()`.

## Rotas públicas (patient portal)

- `/api/v1/public/*`: sem sessão; validação por token/OTP.
- Rate limit por IP (`rateLimit("auth", ip)`).
- Respostas opacas (`jsonSuccessOpaque`) para não vazar existência de dados.

## Webhooks de entrada

- `POST /webhooks/ai` e `/webhooks/chatbot`: validar origem (assinatura/secret).
- Body com schema Zod dedicado; idempotência por `eventId`/`jobId`.

## Erros HTTP

| Status | Uso |
|--------|-----|
| 400 | Validação de input |
| 401 | Sessão inválida/ausente |
| 403 | Permissão negada (RBAC) |
| 404 | Recurso inexistente **no tenant** |
| 409 | Conflito de versão/estado |
| 422 | Erro de validação semântica |
| 502/503 | Falha de parceiro externo |

## i18n

- Erros traduzidos via `ApiT` (namespace `api`).
- Locale negociado do header `Accept-Language`.
- Helper: `getApiT(request)` em `src/lib/api/i18n.ts`.

## Paginação

- `buildPagination(page, limit, totalItems)` em `src/lib/api/pagination.ts`.
- Response: `{ data: T[], pagination: ApiPagination }`.

## Observabilidade

- Correlation id (`x-request-id` ou gerado) propagado aos logs e dispatch externo.

## OpenAPI

- Alterou rota `/api/v1/*` → atualizar `public/openapi.json` (paths, schemas, security, exemplos).
- UI em `/api-doc` (Scalar). Ver `docs/API-DOCS.md`.
