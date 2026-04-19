# Melhoria na Criação de Tenant (Super Admin)

Análise do estado atual e proposta de melhoria para o fluxo de criação de tenants pelo super admin global.

---

## Estado Atual

### Arquivos envolvidos

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| UI | `src/features/settings/app/components/super-admin-tenants-card.tsx` | Form inline + listagem |
| Hook | `src/features/settings/app/hooks/use-super-admin-tenants.ts` | Estado, CRUD, switch de contexto |
| Service | `src/features/settings/app/services/admin-tenants.service.ts` | HTTP `POST /api/v1/admin/tenants` |
| Schema (front) | `src/features/settings/app/utils/schemas.ts` | `createTenantFormSchema` (name + slug) |
| Tipos API | `src/types/api/admin-tenants-v1.ts` | `CreateAdminTenantRequestBody` (name + slug) |
| Route handler | `src/app/api/v1/admin/tenants/route.ts` | `POST` valida + chama use case |
| Validator (back) | `src/lib/validators/tenant.ts` | `postAdminTenantBodySchema` (name + slug) |
| Use case | `src/application/use-cases/admin/create-tenant.ts` | `runCreateTenant()` repassa ao repo |
| Port | `src/application/ports/tenant-repository.port.ts` | `createTenant(params)` + `CreateTenantResult` |
| Repository | `src/infrastructure/repositories/tenant.repository.ts` | `createTenant()` → `prisma.tenant.create` |
| Model | `packages/prisma/schema.prisma` (model Tenant) | 20+ campos, apenas 2 usados na criação |

### O que existe hoje

A criação de tenant é um formulário **inline** no mesmo card da listagem (`SuperAdminTenantsCard`), com apenas **2 campos** numa grid de linha única:

```
[ Nome da clínica ] [ Slug ] [ Criar ]
─────────────────────────────────────
  Lista de tenants abaixo...
```

- **Schema:** `createTenantFormSchema` valida `name` (min 1, max 120) e `slug` (regex kebab-case, 2-64)
- **API:** `POST /api/v1/admin/tenants` recebe `{ name, slug }` e retorna `{ tenant: { id, name, slug } }`
- **Repository:** `prisma.tenant.create({ data: { name, slug } })` — todos os outros campos ficam `null` ou default
- **Pós-criação:** O hook faz `switchTenant(response.tenant.id)` automaticamente

### Problemas

1. **Informações insuficientes** — Campos existentes no model Tenant que ficam vazios: `taxId`, `phone`, `addressLine`, `city`, `postalCode`. Precisam ser configurados depois pelo tenant_admin na aba Configurações > Clínica.

2. **Tenant órfão** — Não existe nenhum membro após criação. O super admin precisa trocar contexto para o tenant, navegar até Configurações > Equipe, e convidar o primeiro `tenant_admin` manualmente.

3. **Sem revisão** — Um clique cria imediatamente. Não há etapa de confirmação.

4. **Layout confuso** — Formulário de criação e listagem de gestão compartilham o mesmo card, sem separação clara.

5. **Sem feedback** — Após criar, o tenant aparece na lista mas o super admin não é guiado para configurar o que falta.

---

## Proposta: Wizard de Criação em Dialog

Substituir o formulário inline por um **dialog wizard com etapas**, seguindo o padrão `AdminAppWizardDialog` (`src/features/apps/app/components/admin-app-wizard-dialog.tsx`).

### Padrão a seguir (referência: AdminAppWizardDialog)

- Um único `useForm` com `zodResolver` para o schema completo
- `type Step = 1 | 2 | 3 | 4`
- Arrays `STEP_N_FIELDS` com os nomes dos campos de cada etapa
- Navegação: `form.trigger(STEP_N_FIELDS)` para validar antes de avançar
- `useState<Step>` para controlar etapa atual
- `Dialog` + `StandardDialogContent` do shadcn
- Footer com botões Voltar / Avançar / Criar
- `useEffect` para reset ao abrir/fechar

---

### Etapa 1 — Identificação (obrigatória)

| Campo | Componente | Obrigatório | Mapeamento Prisma |
|-------|-----------|:-----------:|-------------------|
| Nome da clínica | `FormInput` | Sim | `Tenant.name` |
| Slug | `FormInput` | Sim | `Tenant.slug` |
| CNPJ/CPF | `FormInput` (masked) | Não | `Tenant.taxId` |
| Telefone | `FormInput` (masked) | Não | `Tenant.phone` |

**Auto-slug:** Usar `useWatch` no campo `name` + `useEffect` para gerar slug automaticamente (slugify: NFD → strip diacríticos → lowercase → replace espaços por `-` → replace chars inválidos). Só aplica auto-slug se o campo slug não foi editado manualmente (flag `slugTouched` via `useState`).

**Referência de slugify:** `src/lib/utils/string.ts` se existir, ou inline no componente.

---

### Etapa 2 — Endereço (opcional)

| Campo | Componente | Obrigatório | Mapeamento Prisma |
|-------|-----------|:-----------:|-------------------|
| Endereço | `FormInput` | Não | `Tenant.addressLine` |
| Cidade | `FormInput` | Não | `Tenant.city` |
| CEP | `FormInput` (masked) | Não | `Tenant.postalCode` |

---

### Etapa 3 — Primeiro Administrador (recomendada)

| Campo | Componente | Obrigatório | Observação |
|-------|-----------|:-----------:|------------|
| E-mail | `FormInput` type="email" | Não | Cria ou reutiliza `User` |
| Nome | `FormInput` | Não | Usado se criar `User` novo |

**Lógica no backend (dentro da transação):**
1. Se `adminEmail` preenchido → `prisma.user.findUnique({ where: { email } })`
2. Se `User` existe → cria `TenantMembership` com `role: tenant_admin`
3. Se `User` não existe → `prisma.user.create` com `{ email, name, globalRole: "user" }` + `TenantMembership` + dispara e-mail de convite via Resend (padrão existente em `use-admin-invite.ts`)
4. Se vazio → pula, mostra aviso na etapa de revisão: "Nenhum administrador configurado"

---

### Etapa 4 — Revisão e Confirmação

Resumo visual read-only de tudo que foi preenchido, organizado em seções com `dl`/`dt`/`dd` ou grid de labels + valores:

- **Identificação:** nome, slug, CNPJ, telefone
- **Endereço:** apenas se algum campo foi preenchido
- **Administrador:** e-mail + nome, ou aviso "Nenhum admin"

Botão primário: **"Criar Tenant"** (`Save` icon)

---

## Implementação Detalhada

### 1. Tipos API — `src/types/api/admin-tenants-v1.ts`

Expandir o tipo de request e response:

```typescript
export type CreateAdminTenantRequestBody = {
  name: string;
  slug: string;
  taxId?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  city?: string | null;
  postalCode?: string | null;
  admin?: {
    email: string;
    name?: string;
  } | null;
};

// Response expandido com dados do admin criado
export type CreateAdminTenantResponseData = {
  tenant: AdminTenantDto & {
    taxId: string | null;
    phone: string | null;
    addressLine: string | null;
    city: string | null;
    postalCode: string | null;
  };
  adminCreated: boolean;
  adminEmail: string | null;
};
```

### 2. Validator backend — `src/lib/validators/tenant.ts`

```typescript
export const postAdminTenantBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: tenantSlugSchema,
  taxId: z.string().max(32).optional().or(z.literal("")),
  phone: z.string().max(32).optional().or(z.literal("")),
  addressLine: z.string().max(255).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  postalCode: z.string().max(32).optional().or(z.literal("")),
  admin: z.object({
    email: z.string().email(),
    name: z.string().max(120).optional().or(z.literal("")),
  }).optional().nullable(),
});
```

### 3. Port — `src/application/ports/tenant-repository.port.ts`

Expandir o input do `createTenant`:

```typescript
export type CreateTenantInput = {
  name: string;
  slug: string;
  taxId?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  city?: string | null;
  postalCode?: string | null;
};

export type CreateTenantResult =
  | { ok: true; tenant: { id: string; name: string; slug: string } }
  | { ok: false; code: "SLUG_CONFLICT" };
```

Atualizar a interface `ITenantRepository`:

```typescript
createTenant(params: CreateTenantInput): Promise<CreateTenantResult>;
```

### 4. Repository — `src/infrastructure/repositories/tenant.repository.ts`

Expandir `createTenant()` para aceitar todos os campos:

```typescript
async createTenant(params: CreateTenantInput) {
  try {
    const tenant = await prisma.tenant.create({
      data: {
        name: params.name.trim(),
        slug: params.slug,
        ...(params.taxId ? { taxId: params.taxId } : {}),
        ...(params.phone ? { phone: params.phone } : {}),
        ...(params.addressLine ? { addressLine: params.addressLine } : {}),
        ...(params.city ? { city: params.city } : {}),
        ...(params.postalCode ? { postalCode: params.postalCode } : {}),
      },
    });
    return {
      ok: true as const,
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    };
  } catch (e: unknown) {
    const isUnique =
      typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
    if (isUnique) {
      return { ok: false as const, code: "SLUG_CONFLICT" as const };
    }
    throw e;
  }
}
```

### 5. Use case — `src/application/use-cases/admin/create-tenant.ts`

Expandir para orquestrar criação do tenant + admin opcional numa transação:

```typescript
import { prisma } from "@/infrastructure/database/prisma";
import { tenantPrismaRepository } from "@/infrastructure/repositories/tenant.repository";

type CreateTenantParams = {
  name: string;
  slug: string;
  taxId?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  city?: string | null;
  postalCode?: string | null;
  admin?: { email: string; name?: string } | null;
};

type CreateTenantUseCaseResult =
  | { ok: true; tenant: { id: string; name: string; slug: string }; adminCreated: boolean; adminEmail: string | null }
  | { ok: false; code: "SLUG_CONFLICT" };

export async function runCreateTenant(params: CreateTenantParams): Promise<CreateTenantUseCaseResult> {
  // 1. Criar tenant (com campos expandidos)
  const result = await tenantPrismaRepository.createTenant({
    name: params.name,
    slug: params.slug,
    taxId: params.taxId,
    phone: params.phone,
    addressLine: params.addressLine,
    city: params.city,
    postalCode: params.postalCode,
  });

  if (!result.ok) return result;

  // 2. Se admin fornecido, criar membership dentro de transação
  let adminCreated = false;
  let adminEmail: string | null = null;

  if (params.admin?.email) {
    adminEmail = params.admin.email.trim().toLowerCase();

    await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email: adminEmail! } });

      if (!user) {
        user = await tx.user.create({
          data: {
            email: adminEmail!,
            name: params.admin!.name?.trim() || null,
            globalRole: "user",
          },
        });
        adminCreated = true;
      }

      await tx.tenantMembership.create({
        data: {
          userId: user.id,
          tenantId: result.tenant.id,
          role: "tenant_admin",
        },
      });
    });

    // 3. Se criou user novo, disparar e-mail de convite
    // Reusar padrão existente (Resend) — ver src/infrastructure/email/
    if (adminCreated) {
      // TODO: chamar port de e-mail para enviar convite
    }
  }

  return {
    ok: true,
    tenant: result.tenant,
    adminCreated,
    adminEmail,
  };
}
```

### 6. Route handler — `src/app/api/v1/admin/tenants/route.ts`

Expandir o `POST` para passar os novos campos:

```typescript
export async function POST(request: Request) {
  // ... auth + superAdminOr403 (sem mudança) ...

  const parsed = postAdminTenantBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const result = await runCreateTenant({
    name: parsed.data.name,
    slug: parsed.data.slug,
    taxId: parsed.data.taxId || null,
    phone: parsed.data.phone || null,
    addressLine: parsed.data.addressLine || null,
    city: parsed.data.city || null,
    postalCode: parsed.data.postalCode || null,
    admin: parsed.data.admin ?? null,
  });

  if (!result.ok) {
    return jsonError("CONFLICT", apiT("errors.tenantSlugConflict"), 409);
  }

  return jsonSuccess({
    tenant: result.tenant,
    adminCreated: result.adminCreated,
    adminEmail: result.adminEmail,
  }, { status: 201 });
}
```

### 7. Service frontend — `src/features/settings/app/services/admin-tenants.service.ts`

Atualizar `createAdminTenant()` para aceitar o body expandido (já tipado por `CreateAdminTenantRequestBody`). Sem mudança estrutural — o tipo expande automaticamente.

### 8. Schema frontend — `src/features/settings/app/utils/schemas.ts`

Substituir `createTenantFormSchema` por `createTenantWizardSchema`:

```typescript
export const createTenantWizardSchema = z.object({
  // Step 1 — Identificação
  name: z.string().trim().min(1, "Informe o nome da clínica.").max(120),
  slug: z.string().trim().min(2, "Mínimo 2 caracteres.").max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use minúsculas, números e hífens."),
  taxId: z.string().max(32).optional().or(z.literal("")),
  phone: z.string().max(32).optional().or(z.literal("")),
  // Step 2 — Endereço
  addressLine: z.string().max(255).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  postalCode: z.string().max(32).optional().or(z.literal("")),
  // Step 3 — Admin
  adminEmail: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  adminName: z.string().max(120).optional().or(z.literal("")),
});

export type CreateTenantWizardValues = z.infer<typeof createTenantWizardSchema>;
```

Manter `createTenantFormSchema` antigo até a migração estar completa, depois remover.

### 9. Componente — `src/features/settings/app/components/create-tenant-wizard-dialog.tsx` (NOVO)

Estrutura seguindo o padrão `AdminAppWizardDialog`:

```
type Step = 1 | 2 | 3 | 4;

STEP1_FIELDS = ["name", "slug", "taxId", "phone"]
STEP2_FIELDS = ["addressLine", "city", "postalCode"]
STEP3_FIELDS = ["adminEmail", "adminName"]
// Step 4 = revisão (sem campos)
```

- `Dialog` + `StandardDialogContent` com `size="lg"`
- Stepper visual no header (indicador de etapas com números/ícones)
- `form.trigger(STEP_N_FIELDS)` antes de avançar etapa
- Etapa 4: componente de revisão read-only com seções
- Footer: `Voltar` (ghost) | indicador `1/4` | `Avançar` (default) ou `Criar Tenant` (na etapa 4)
- `onSaved` callback para reload da listagem

### 10. Alteração em `SuperAdminTenantsCard`

- Remover o `<form>` inline com `FormInput` de name/slug
- Adicionar botão `"Novo Tenant"` (`Plus` icon) no header do card, ao lado do `Refresh`
- Botão abre `<CreateTenantWizardDialog>`
- Remover `createTenantFormSchema` do import (usar o novo wizard schema)
- O hook `useSuperAdminTenants` mantém `createTenant()` mas o input expande

### 11. Hook — `src/features/settings/app/hooks/use-super-admin-tenants.ts`

Expandir o tipo do input de `createTenant`:

```typescript
const createTenant = useCallback(
  async (input: CreateAdminTenantRequestBody) => {
    setCreating(true);
    try {
      const response = await createAdminTenant(input);
      await reload();
      await switchTenant(response.tenant.id);
      return response;
    } finally {
      setCreating(false);
    }
  },
  [reload, switchTenant],
);
```

### 12. i18n — `messages/{pt-BR,en}/settings.json`

Adicionar chaves no namespace `settings.tenants.wizard`:

```
wizard.step1Title, wizard.step1Description
wizard.step2Title, wizard.step2Description
wizard.step3Title, wizard.step3Description
wizard.step4Title, wizard.step4Description
wizard.nameLabel, wizard.slugLabel, wizard.taxIdLabel, wizard.phoneLabel
wizard.addressLabel, wizard.cityLabel, wizard.postalCodeLabel
wizard.adminEmailLabel, wizard.adminNameLabel
wizard.adminHint (aviso sobre criação automática de usuário)
wizard.noAdminWarning ("Nenhum administrador configurado")
wizard.reviewSection.identification, .address, .admin
wizard.createButton
```

### 13. OpenAPI — `public/openapi.json`

Atualizar o schema de `POST /api/v1/admin/tenants`:
- Request body: adicionar campos opcionais (`taxId`, `phone`, `addressLine`, `city`, `postalCode`, `admin`)
- Response: adicionar `adminCreated` e `adminEmail`

---

## Melhorias na Listagem (bônus)

Complementar ao wizard, a listagem em `SuperAdminTenantsCard` pode ser melhorada:

1. **Expandir `AdminTenantListItemDto`** — Incluir `phone`, `city`, `memberCount` para exibir na listagem sem request adicional. Requer ajuste no `GET /api/v1/admin/tenants` e na query `listTenantSummariesForSuperAdmin` (adicionar `_count: { memberships: true }`)

2. **Badge de completude** — Badge "Config. pendente" se `taxId` ou `phone` é null, ou `memberCount === 0`. Calculado no frontend a partir dos dados do DTO expandido

3. **Busca** — Input com `useDebouncedState` para filtrar tenants por nome/slug no frontend (lista geralmente pequena)

---

## Prioridade de Implementação

1. **Backend expandido** — Itens 1–6 (tipos, validator, port, repo, use case, route handler)
2. **Wizard com etapas 1 + 3 + 4** — Itens 8–10 (schema, componente, alteração no card)
3. **Etapa 2 do wizard** — Endereço
4. **Melhorias na listagem** — DTO expandido, badge, busca

---

*Documento gerado em 19/04/2026.*
