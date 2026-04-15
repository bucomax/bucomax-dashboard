# Searchable select (estático + remoto) — decisões fechadas

Spec para implementação do combobox com busca, alinhado ao envelope v1 e à paginação já usada no painel (`buildPagination` / `ApiPagination`). **Escopo completo:** estático com filtro local, **virtualização** para listas estáticas grandes, remoto com **offset** ou **cursor**, infinite scroll, badge + X, debounce/abort.

---

## Onde encaixa no repositório

| Peça | Local | Motivo |
|------|--------|--------|
| Tipos compartilhados (`SelectOption`, loaders, props, discriminação offset/cursor) | `src/types/searchable-select.ts` | Contratos em `src/types/`. |
| Componente primitivo (Combobox Base UI: trigger, popup, busca, lista virtualizada quando aplicável, badge seleção, estados) | `src/shared/components/ui/searchable-select.tsx` | Mesmo nível de `select.tsx`. |
| Virtualização (lista estática) | Dependência **`@tanstack/react-virtual`** (ou equivalente leve) usada **dentro** do primitivo no ramo `static` quando `virtualizeStatic?: true` ou acima de threshold | Performance com milhares de opções filtradas. |
| Integração RHF | `src/shared/components/forms/form-searchable-select.tsx` (ou evoluir `form-select.tsx`) | `Controller` + `FieldError`. |
| Integração sem RHF | `src/shared/components/forms/labeled-searchable-select.tsx` (ou evoluir `labeled-select.tsx`) | Par com `LabeledSelect`. |
| Helpers: envelope + `ApiPagination` → resultado offset; resposta cursor → resultado cursor | `src/lib/api/searchable-select-remote.ts` | Mapeamento puro reutilizável nos `loadPage`. |
| Debounce | `src/shared/hooks/use-debounce.ts` | `useDebouncedState` / `DEBOUNCE_MS` (~300 ms) no remoto. |
| Infinite scroll (remoto) | `IntersectionObserver` + sentinel no primitivo ou `useInfiniteScrollSentinel` em `src/shared/hooks/` | Carregar próxima página ou próximo cursor. |
| i18n | `messages/pt-BR/common.json` + `en` (ou `forms.json`) | Chaves da §5. |
| Migração das telas | Por feature | Após primitivo + wrappers estáveis. |

**Fluxo de dependência:** features implementam `loadPage` em `*.service.ts` com `apiClient`; o componente só recebe a função — sem Prisma/rotas.

---

## Como fazer (ordem sugerida)

1. **Tipos** em `src/types/searchable-select.ts`: `SelectOption`, contratos **offset e cursor** (discriminados).
2. **Dependência** `@tanstack/react-virtual` (adicionar ao `package.json`) e hook/fragmento de lista virtual no ramo estático.
3. **Helpers** em `src/lib/api/searchable-select-remote.ts`: `mapApiListToRemotePage` (offset) + `mapApiCursorToRemotePage` (cursor), conforme contratos abaixo.
4. **UI** `searchable-select.tsx`: estático (filtro local + virtualização configurável); remoto offset; remoto cursor; debounce + abort; infinite scroll; badge + X.
5. **Wrappers** Form / Labeled.
6. **Tela piloto** + migração gradual.

---

## 1. Contrato de dados

### Estático

- `options: SelectOption[]` com `value`, `label`, `disabled?`.
- Filtro **local** (normalização de texto opcional).
- **Virtualização (escopo obrigatório):** prop algo como `virtualizeStatic?: boolean` (default `false` para listas pequenas) e/ou `staticVirtualizeThreshold?: number` (ex.: acima de **500** itens, liga virtualização automaticamente). Implementação com `@tanstack/react-virtual`: altura de linha estável ou `measureElement`; lista rolável com altura máxima; teclado (↑↓) deve atualizar foco/seleção de forma coerente com o índice virtual.

```ts
type SelectOption = { value: string; label: string; disabled?: boolean };
```

### Remoto — duas estratégias (ambas no escopo)

O componente expõe **pagination strategy** no modo remoto, por exemplo `remotePagination: 'offset' | 'cursor'`.

#### Offset (página numérica + `nextPage`)

```ts
type LoadRemoteOffsetPageArgs = {
  query: string;
  page: number; // 1-based
  pageSize: number;
  signal: AbortSignal;
};

type RemoteOffsetPageResult = {
  items: SelectOption[];
  nextPage: number | null;
};

type LoadRemoteOffsetPage = (args: LoadRemoteOffsetPageArgs) => Promise<RemoteOffsetPageResult>;
```

- Mapeamento típico: `pagination.hasNextPage` → `nextPage = hasNextPage ? page + 1 : null`.
- Infinite scroll: enquanto `nextPage !== null`, ao fim da lista, chamar `loadPage` com `page: nextPage` e **concatenar** itens (dedupe por `value`).

#### Cursor (token opaco / `nextCursor`)

```ts
type LoadRemoteCursorPageArgs = {
  query: string;
  pageSize: number;
  /** `null` na primeira página; depois o valor devolvido pela API na página anterior. */
  cursor: string | null;
  signal: AbortSignal;
};

type RemoteCursorPageResult = {
  items: SelectOption[];
  /** `null` quando não há mais dados. */
  nextCursor: string | null;
};

type LoadRemoteCursorPage = (args: LoadRemoteCursorPageArgs) => Promise<RemoteCursorPageResult>;
```

- Estado interno guarda `nextCursor`; ao abrir ou mudar query, resetar para `cursor: null`.
- Infinite scroll: `loadPage({ query, cursor: nextCursor, pageSize, signal })`; concatenar itens.
- Helper `mapApiCursorToRemotePage` no mesmo arquivo de helpers, alinhado ao envelope real das rotas que usarem cursor.

**Segurança:** apenas `loadPage` via service + `apiClient` — sem URL arbitrária em runtime.

---

## 2. Valor selecionado fora da página atual (badge + X)

- Acima de **Buscar…** e da listagem: **badge** com label + **X** para limpar (`onValueChange` / valor sentinela conforme formulário).
- Label: item já na lista carregada; senão `selectedLabel` / `initialSelectedOption` vindo do servidor.
- Ordem: **badge** → separador → **busca** → **lista** (virtualizada ou não) → estados.

---

## 3. Rede (remoto)

- Debounce ~**300 ms** (`useDebouncedState` ou equivalente).
- **AbortController** por rodada de busca.

---

## 4. i18n

- `searchPlaceholder`, `clearSelection`, `loading`, `loadMore`, `empty`, `errorLoad`, `minLengthHint` (se houver `minSearchLength`).

---

## 5. Modos e props resumo

- `mode: 'static' | 'remote'` — default **`static`**.
- `remotePagination: 'offset' | 'cursor'` — obrigatório quando `mode === 'remote'` (define qual assinatura de `loadPage` o componente espera).
- Modo remoto: `loadPage` + `pageSize`; opcional `selectedLabel` / `initialSelectedOption`.
- Modo estático: `virtualizeStatic` / threshold conforme §1.

---

## OpenAPI

- Rotas usadas com **cursor** devem documentar query/body de cursor e formato de resposta para os loaders ficarem tipados e estáveis.
