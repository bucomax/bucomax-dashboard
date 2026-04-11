# Plano: Cadastro de Menor + Endereço com CEP + Melhorias no Fluxo de Registro

## Contexto

Requisitos levantados de áudios do cliente (bucomaxilofacial). O sistema atual (`Client` model) possui apenas: `name`, `phone`, `email`, `caseDescription`, `documentId` (CPF). Faltam campos de endereço, suporte a menor de idade com responsável, e busca automática de CEP.

## Estado atual

- **Client model** (Prisma): sem campos de endereço, sem guardian/responsável, sem flag de menor.
- **Wizard de criação** (`new-client-wizard.tsx`): 3 steps — dados → pathway → review.
- **Self-register público** (`patient-self-register-page.tsx`): nome, phone, CPF, email, caso.
- **Profile edit** (`client-detail-profile-card.tsx`): inline edit com dirty tracking.
- **Validators**: `src/lib/validators/client.ts` — `postClientBodySchema`, `patchClientBodySchema`, `publicPatientSelfRegisterBodySchema`.
- **API types**: `src/types/api/clients-v1.ts` — `ClientDto`, `ClientDetailClientDto`, etc.
- **Tenant model** já possui `addressLine`, `city`, `postalCode` (referência de padrão).

---

## Fase 1: Schema Prisma — novos campos no Client

### Migration: `add_client_address_and_guardian`

Adicionar ao model `Client`:

```prisma
// === Endereço ===
postalCode    String?   // CEP (8 dígitos)
addressLine   String?   // Logradouro (rua + número)
addressNumber String?   // Número
addressComp   String?   // Complemento
neighborhood  String?   // Bairro
city          String?   // Cidade
state         String?   // UF (2 chars)

// === Menor de idade / Responsável ===
isMinor              Boolean  @default(false)
guardianName         String?  // Nome do responsável legal
guardianDocumentId   String?  // CPF do responsável (11 dígitos)
guardianPhone        String?  // Telefone do responsável
```

**Regras:**
- Todos os campos novos são **nullable/optional** → migration non-breaking.
- `isMinor = true` → `guardianName` e `guardianDocumentId` obrigatórios na validação (Zod), não no DB (para não bloquear dados legados).
- Quando `isMinor = true`, o `documentId` (CPF do paciente) torna-se **opcional** (menor pode não ter CPF).

---

## Fase 2: Validators (Zod)

### `src/lib/validators/client.ts`

1. **Novos sub-schemas:**
   - `addressSchema` — `postalCode` (8 dígitos), `addressLine`, `addressNumber`, `addressComp` (opcional), `neighborhood`, `city`, `state` (2 chars UF).
   - `guardianSchema` — `guardianName` (1-200), `guardianDocumentId` (CPF 11 dígitos), `guardianPhone` (10-11 dígitos).

2. **`postClientBodySchema`** — extend com:
   - Campos de endereço (todos opcionais no schema base).
   - `isMinor` (boolean, default false).
   - Campos de guardian (opcionais no schema base).
   - `superRefine`: se `isMinor === true` → `guardianName` e `guardianDocumentId` obrigatórios; `documentId` (CPF do menor) torna-se opcional.
   - `superRefine`: se `isMinor === false` → `documentId` obrigatório (comportamento atual).

3. **`patchClientBodySchema`** — extend com mesmos campos opcionais + mesma lógica de superRefine.

4. **`publicPatientSelfRegisterBodySchema`** — extend com endereço + isMinor + guardian.

### `src/lib/validators/cep.ts` (novo)

- `digitsOnlyCep(value)` — extrai 8 dígitos.
- `cepDigitsSchema` — `z.string().length(8)`.

---

## Fase 3: API Types

### `src/types/api/clients-v1.ts`

Atualizar `ClientDto` e `ClientDetailClientDto` com novos campos:

```typescript
// Endereço
postalCode: string | null;
addressLine: string | null;
addressNumber: string | null;
addressComp: string | null;
neighborhood: string | null;
city: string | null;
state: string | null;

// Menor / Responsável
isMinor: boolean;
guardianName: string | null;
guardianDocumentId: string | null;
guardianPhone: string | null;
```

Atualizar `PublicPatientSelfRegisterFormPrefillDto` com mesmos campos.

---

## Fase 4: API Routes

### `POST /api/v1/clients` e `PATCH /api/v1/clients/:id`

- Ajustar `select` do Prisma para incluir novos campos no retorno.
- Novos campos passam pelo validator atualizado — sem lógica extra no handler.

### `POST /api/v1/public/patient-self-register`

- Aceitar novos campos no body.
- Persistir no `prisma.client.create` / `update`.
- Incluir na `formPrefill` do `GET`.

### `PATCH /api/v1/patient/profile`

- Avaliar se paciente pode editar endereço e dados de responsável pelo portal. **Decisão sugerida:** sim, exceto `isMinor` (só staff altera flag de menor).

---

## Fase 5: Busca de CEP (ViaCEP)

### `src/lib/utils/cep-lookup.ts` (novo)

```typescript
type CepResult = {
  postalCode: string;
  addressLine: string; // logradouro
  neighborhood: string;
  city: string;
  state: string;      // UF
};

async function lookupCep(cep: string): Promise<CepResult | null>
```

- API pública: `https://viacep.com.br/ws/{cep}/json/`
- Timeout 5s, sem retry (best effort para UX).
- Retorna `null` se CEP inválido ou API fora.

### `src/shared/components/forms/form-cep.tsx` (novo)

- Input mascarado (XXXXX-XXX).
- Ao completar 8 dígitos → chama `lookupCep` automaticamente.
- Preenche campos de endereço no form via `setValue`.
- Loading indicator durante busca.
- Campos de endereço editáveis manualmente (CEP é atalho, não obrigatório).

---

## Fase 6: Frontend — Wizard de criação (staff)

### `src/features/clients/app/components/new-client-wizard.tsx`

**Step 1 — expandir formulário:**

1. Após os campos atuais (nome, phone, CPF, email), adicionar:
   - **Checkbox "Menor de idade"** (`isMinor`).
   - Quando checked, mostrar bloco de guardian:
     - `guardianName` — Nome do responsável
     - `guardianDocumentId` — CPF do responsável (FormCpf)
     - `guardianPhone` — Telefone do responsável (FormPhoneNumber)
   - E tornar CPF do paciente opcional (label muda para "CPF do menor (opcional)").

2. **Seção de endereço** (novo bloco visual):
   - `FormCep` — CEP com busca automática
   - `addressLine` — Logradouro (preenchido pelo CEP)
   - `addressNumber` — Número
   - `addressComp` — Complemento (opcional)
   - `neighborhood` — Bairro (preenchido pelo CEP)
   - `city` — Cidade (preenchido pelo CEP)
   - `state` — UF (preenchido pelo CEP)

3. **Step 3 (review)** — exibir dados de endereço e guardian na revisão.

### `src/features/clients/app/utils/schemas.ts`

- `newClientFormSchema` extends do novo `postClientBodySchema`.
- Adicionar `defaultValues` para novos campos.

---

## Fase 7: Frontend — Self-register público

### `src/features/clients/app/pages/patient-self-register-page.tsx`

- Adicionar checkbox "Menor de idade" + campos de guardian.
- Adicionar seção de endereço com busca de CEP.
- Prefill de novos campos quando `formPrefill` retornar.

---

## Fase 8: Frontend — Profile edit

### `src/features/clients/app/components/client-detail-profile-card.tsx`

- **Variant staff:** adicionar campos de endereço + checkbox menor + guardian.
- **Variant patient (portal):** adicionar campos de endereço (editável); guardian read-only (só staff altera).

---

## Fase 9: i18n

### `messages/pt-BR/clients.json` e `messages/en/clients.json`

Adicionar chaves para:
- Labels: `postalCode`, `addressLine`, `addressNumber`, `addressComp`, `neighborhood`, `city`, `state`
- Labels: `isMinor`, `guardianName`, `guardianDocumentId`, `guardianPhone`
- Hints: `postalCodeHint` ("Digite o CEP para preenchimento automático")
- Validation: `guardianRequired`, `guardianCpfRequired`, `cepInvalid`
- Section headers: `addressSection`, `guardianSection`

### `messages/pt-BR/api.json` e `messages/en/api.json`

Adicionar chaves de validação para os novos erros Zod.

---

## Arquivos impactados (resumo)

| Arquivo | Mudança |
|---------|---------|
| `packages/prisma/schema.prisma` | Novos campos Client |
| `src/lib/validators/client.ts` | Schemas expandidos |
| `src/lib/validators/cep.ts` | **Novo** — CEP helpers |
| `src/lib/utils/cep-lookup.ts` | **Novo** — ViaCEP fetch |
| `src/types/api/clients-v1.ts` | DTOs atualizados |
| `src/shared/components/forms/form-cep.tsx` | **Novo** — input CEP |
| `src/features/clients/app/components/new-client-wizard.tsx` | Formulário expandido |
| `src/features/clients/app/utils/schemas.ts` | Form schemas |
| `src/features/clients/app/components/client-detail-profile-card.tsx` | Profile edit expandido |
| `src/features/clients/app/pages/patient-self-register-page.tsx` | Self-register expandido |
| `src/app/api/v1/clients/route.ts` | Select campos novos |
| `src/app/api/v1/clients/[clientId]/route.ts` | Select campos novos |
| `src/app/api/v1/public/patient-self-register/route.ts` | Persist campos novos |
| `src/app/api/v1/patient/profile/route.ts` | Endereço editável |
| `src/lib/validators/patient-portal-profile.ts` | Endereço no portal |
| `messages/pt-BR/clients.json` | Labels PT |
| `messages/en/clients.json` | Labels EN |
| `messages/pt-BR/api.json` | Validation PT |
| `messages/en/api.json` | Validation EN |
| `public/openapi.json` | Schemas atualizados |
| `docs/ARCHITECTURE.md` | §8 Client model |

---

## Decisões de design

1. **CPF do menor é opcional** quando `isMinor = true` — alinhado ao pedido do áudio ("ele não tem CPF").
2. **Endereço é opcional** no cadastro — permite criação rápida, preenchimento posterior.
3. **ViaCEP** para busca de endereço — API pública gratuita, sem chave, cobertura nacional.
4. **Guardian data no mesmo model** (não tabela separada) — simplicidade; um menor tem um responsável; se no futuro precisar de múltiplos, migra.
5. **Staff controla `isMinor`** — paciente no portal não pode alterar essa flag (implicação legal).
6. **Endereço estruturado** (campos separados) ao invés de texto livre — permite preenchimento automático de contratos futuros.

## Fora de escopo (mencionado nos áudios mas não implementável agora)

- **Preenchimento automático de contratos** — requer template engine (futuro). Os dados serão capturados agora para uso posterior.
- **Confirmação por e-mail pós-cadastro** — o fluxo atual já usa magic link / OTP. A "confirmação de e-mail" do áudio 1 pode ser o envio do magic link que já existe.
- **"Criar senha para área dele"** (áudio 2) — o portal do paciente usa OTP/magic link, não senha. Manter padrão atual (mais seguro, sem gestão de senha).
