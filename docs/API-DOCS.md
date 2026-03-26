# Documentação da API — Scalar + OpenAPI

Referência interativa da API REST (`/api/v1`) usando **[Scalar](https://scalar.com/)** sobre um documento **OpenAPI 3.x** (`openapi.json`).

---

## Objetivos

- Uma **fonte de verdade** para contratos (paths, métodos, schemas, exemplos, segurança).
- UI **Try it** contra o ambiente local ou staging (com token Bearer).
- Mesmo padrão adotado no projeto de referência **kaber.ai** (`@scalar/nextjs-api-reference` + `public/openapi.json`).

---

## Artefatos

| Artefato | Função |
|----------|--------|
| **`public/openapi.json`** | Especificação OpenAPI 3.x servida como arquivo estático. Pode ser editada na mão no início; depois gerar/validar com scripts se desejarem. |
| **Página Next.js** | Rota dedicada (ex.: **`/api-doc`** ou **`/docs/api`**) que renderiza o componente Scalar apontando para `/openapi.json`. |
| **(Opcional)** `GET /api/v1/openapi.json` | Mesmo JSON via route handler se preferir não usar `public/` ou para versionar por ambiente. |

---

## Dependência

```bash
npm install @scalar/nextjs-api-reference
```

Versão alinhada ao Next.js do projeto (ver compatibilidade na documentação do pacote).

---

## Implementação (App Router)

1. Colocar o spec em **`public/openapi.json`** (mínimo: `openapi: "3.0.3"`, `info`, `servers`, `paths` para `/api/v1/health`, etc.).
2. Criar **`app/api-doc/page.tsx`** (ou `app/docs/api/page.tsx`) como **Client Component** se o Scalar exigir (`'use client'`), importando o componente do pacote `@scalar/nextjs-api-reference` e passando a URL do documento, por exemplo:
   - `configuration={{ spec: { url: '/openapi.json' } }}`  
   ou equivalente conforme a API do pacote na versão instalada.
3. Garantir que **`NEXTAUTH_URL` / URL pública** esteja correta em `servers` do OpenAPI para o **Try it** apontar para `http://localhost:3000` em dev.

### Autenticação no Scalar

- No OpenAPI, definir **`securitySchemes`**: `BearerAuth` (HTTP bearer, JWT).
- Nas operações protegidas, listar `security: [BearerAuth: []]`.
- O usuário cola o `access_token` no Scalar para testar rotas autenticadas.

### CORS

- Se o Scalar fizer chamadas do browser para a mesma origem, não costuma ser problema.
- Se hospedar a doc em outro host, replicar a política CORS já prevista na arquitetura para `/api/*`.

---

## Manutenção

- **Sempre que** adicionar ou alterar rota em `/api/v1/*`, atualizar **`public/openapi.json`** (path, método, request/response, códigos de erro).
- Opcional no CI: validar o JSON com **Spectral** ou `swagger-cli validate`.
- Referência cruzada: tipos em **`src/types/api/`** devem refletir os schemas do OpenAPI (nomes e campos alinhados).

---

## Rotas úteis (documentação)

| URL | Descrição |
|-----|-----------|
| `/api-doc` | UI Scalar (ajustar se escolher outro path). |
| `/openapi.json` | Spec estático (via `public/`). |

---

## Checklist ao criar endpoint novo

- [ ] Atualizar `openapi.json` (path, tags, summary, `requestBody`, `responses`, `security`).
- [ ] Exemplo de body/response realista em `examples` quando ajudar integradores.
- [ ] Testar **Try it** com Bearer em dev.

---

*Detalhes de import exato do componente Scalar variam por versão do `@scalar/nextjs-api-reference` — conferir README do pacote no npm.*
