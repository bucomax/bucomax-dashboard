# Regra: code-organization

Aplica-se a **todos os arquivos** do projeto.

## Tipos e interfaces

- **Proibido** declarar `interface`/`type` soltos em `route.ts`, `page.tsx` ou componentes de UI — exceto tipos realmente locais de um único arquivo.
- **Onde colocar:**
  - `src/types/` — contratos compartilhados por domínio (`auth.ts`, `pathway.ts`, `dashboard-pipeline.ts`)
  - `src/types/api/<domínio>-v1.ts` — DTOs de request/response da API
  - `src/features/<nome>/app/types/` — tipos exclusivos da feature (barrel `api.ts` reexporta de `@/types/api/`)
- **DTOs de API:** manter **par** schema Zod ↔ tipo inferido (`z.infer<typeof schema>`) para fonte de verdade única.
- Schemas Zod em `src/lib/validators/<domínio>.ts`.

## Utilitários e constantes

- `src/lib/utils/` — funções puras (formatação, parsing, máscaras, slugify). Um arquivo por tema.
- `src/lib/constants/` — strings mágicas, limites, enums de UI.
- `src/shared/constants/` — constantes de UI compartilhadas.
- Evitar funções utilitárias genéricas dentro de `components/`.

## Rotas e componentes

- `route.ts`: imports, chamada ao use case, mapeamento DTO → HTTP; validação via schema Zod importado.
- Componentes: só JSX + hooks + props tipadas importando tipos de `@/types/` ou `@/features/<nome>/types`.

## Barrel exports

- `src/types/index.ts` pode reexportar; evitar barrels profundos que criem dependências circulares.

## Nomenclatura de arquivos

- Arquivos: **kebab-case** (`client-detail-query.ts`, não `clientDetailQuery.ts`)
- Componentes React: **PascalCase** (`ClientCard.tsx`)
- `*.types.ts` opcional para agrupar só tipos quando o módulo crescer
- Inglês nos nomes de arquivos e símbolos exportados

## Nomenclatura de tipos API

- Query string: sufixo `QueryParams` (ex.: `ListClientsQueryParams`)
- Corpo `data` de sucesso: sufixo `ResponseData` (ex.: `ClientsListResponseData`)
- Reutilizar tipos compartilhados (`ApiPagination`, `SlaHealthStatus`) em vez de duplicar
