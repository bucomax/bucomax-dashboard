# Regra: http-services-api-types

Aplica-se a arquivos em `src/types/api/**/*.ts` e `**/services/*.service.ts`.

## Onde fica cada coisa

- **`src/types/api/<domínio>-v1.ts`** — tipos de request/response alinhados ao envelope `{ success, data, meta }` e às rotas `/api/v1/...`.
- **`src/features/<feature>/app/types/api.ts`** — barrel que reexporta `export type * from "@/types/api/<arquivo>"`.
- **`src/features/**/services/*.service.ts`** — **apenas** funções HTTP. **Não** declarar tipos de contrato locais; importar de `@/types/api/`.

## Nomes

- Query string: sufixo `QueryParams` (ex.: `ListClientsQueryParams`).
- Corpo `data` de sucesso: sufixo `ResponseData` (ex.: `ClientsListResponseData`, `ClientDetailResponseData`).
- Reutilizar tipos compartilhados (`ApiPagination`, `SlaHealthStatus`) em vez de duplicar unions.

## Services

- Funções que chamam `apiClient` / HTTP.
- Importam tipos de `@/types/api/<domínio>-v1.ts` (ou do barrel da feature).
- Retornam o tipo do envelope (`ApiSuccessEnvelope<T>`) ou o `data` já extraído.
- Padrão existente: `src/features/clients/app/services/clients.service.ts`.

## Paginação

- Listas paginadas: `data[]` + `pagination` (`buildPagination` em `@/lib/api/pagination`).

## SOLID

- **SRP:** service é adaptador HTTP; tipos são contrato estável testável.
- Evita tipo escondido no `.service.ts` e mantém paridade com `code-organization`.

## Toasts

- `apiClient` exibe `toast.error` automaticamente em falhas HTTP.
- `skipErrorToast: true` para chamadas auxiliares.
- `toastSuccessMessage` no config para mensagem de sucesso.
- Não duplicar `toast.error` no catch quando `apiClient` já cobre.
