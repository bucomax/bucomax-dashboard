# Página: Configurações

## Origem do mock

- **Arquivo:** [`arquivos-interfaces/configuracoes.html`](../../../arquivos-interfaces/configuracoes.html)
- **Layout:** sidebar interna com seções + área de conteúdo.

## Objetivo no produto

Centralizar **perfil**, **dados da clínica**, **fases do tratamento** (DnD + SLA), **notificações**, **equipe**, **fornecedores OPME** e **integrações** — parte disso já existe no app (conta, membros, convites); o mock antecipa escopo Bucomax ampliado.

---

## Rota sugerida

- `/[locale]/settings` com **sub-rotas ou tabs** alinhadas ao mock:
  - `/settings/profile` — já pode coincidir com área “account”
  - `/settings/clinic` — novo ou extensão de `Tenant`
  - `/settings/pathway-stages` — **editor DnD de colunas** ([../column-editor-drag-drop.md](../column-editor-drag-drop.md))
  - `/settings/notifications` — preferências (gap)
  - `/settings/team` — overlap com `users-management` / convites existentes
  - `/settings/opme` — CRUD fornecedores (gap)
  - `/settings/integrations` — flags (gap)

Ou uma única página com `Tabs`/`Sidebar` client-side (como o mock).

---

## Seções do mock → feature → dados

### 1. Perfil (`section-profile`)

| Campo mock | Persistência sugerida |
|------------|------------------------|
| Nome, e-mail, telefone | `User` (+ NextAuth) |
| CRO, especialidade | **Gap:** `User.metadata` JSON ou tabela `ProfessionalProfile` |

**Backend:** `PATCH /api/v1/users/me` ou rota já existente de perfil.  
**Frontend:** formulário reutilizando cards de account se já houver.

---

### 2. Clínica (`section-clinic`)

| Campo mock | Persistência sugerida |
|------------|------------------------|
| Nome da clínica | `Tenant.name` |
| CNPJ, telefone, endereço, cidade, CEP | **Gap:** `Tenant` campos extras ou `TenantSettings` JSON |
| Hospitais conveniados (textarea) | **Gap:** texto em settings ou tabela `AffiliatedHospital` |

**Backend:** `PATCH /api/v1/tenants/:id` restrito a `tenant_admin`.  
**Frontend:** form com validação (CNPJ opcional formatado).

---

### 3. Fases do tratamento (`section-phases`)

| Comportamento mock | Implementação real |
|--------------------|---------------------|
| Lista de fases com “alerta após N dias” e “X documentos automáticos” | **Ordem e CRUD de colunas:** lista **DnD** ([../column-editor-drag-drop.md](../column-editor-drag-drop.md)); SLA por etapa em metadata ou tabela; contagem de docs quando `StageDocument` existir |

**Backend:** mesmos endpoints de [../persistence-api-and-transitions.md](../persistence-api-and-transitions.md) + eventual `PATCH` em metadata de SLA por `PathwayStage`.  
**Frontend:** substituir inputs estáticos do HTML por editor conectado à API + botão Publicar.

---

### 4. Notificações (`section-notifications`)

| Toggle mock | Realidade |
|-------------|-----------|
| Alertas críticos, lembretes cirurgia, novos pacientes, relatório semanal, confirmação envio docs | **Gap:** `UserNotificationPrefs` ou `TenantNotificationPrefs` + jobs futuros |

**Backend:** CRUD preferências; workers/envio fora do escopo mínimo.  
**Frontend:** `Switch` persistindo por campo.

---

### 5. Equipe (`section-team`)

| Mock | App atual |
|------|-----------|
| Lista membros, papéis, adicionar/editar/excluir | `TenantMembership` + telas de invite/users já previstas |

**Backend:** reutilizar `/api/v1/...` de membros/convites (RBAC).  
**Frontend:** alinhar ao `users-management-panel` / cards existentes.

---

### 6. Fornecedores OPME (`section-opme`)

| Mock | Persistência |
|------|----------------|
| Lista Art Fix, Evolve, etc.; contagem pacientes ativos | **Gap:** `OpmeSupplier` + FK em `Client` |

**Backend:** CRUD `/api/v1/tenants/:id/opme-suppliers` + agregação count por supplier.  
**Frontend:** lista + dialog criar/editar.

---

### 7. Integrações (`section-integrations`)

| Mock | Notas |
|------|--------|
| WhatsApp, Google Calendar, financeiro, prontuário | **Flags** em `TenantSettings`; integrações reais em fases posteriores ([../../BUCOMAX-INTERFACES-AND-DATA.md](../../BUCOMAX-INTERFACES-AND-DATA.md)) |

**Backend:** `PATCH` settings JSON.  
**Frontend:** `Switch` + texto explicativo.

---

## Backend (consolidado)

### Tabelas tocadas (direta ou indiretamente)

- `User`, `Tenant`, `TenantMembership`
- `CarePathway`, `PathwayVersion`, `PathwayStage` (fases)
- Novas conforme gaps: settings clínica, OPME, notificações, perfil profissional

### Checklist backend

- [ ] Política de autorização por sub-seção (`tenant_admin` vs `tenant_user`)
- [ ] Endpoints de pathway/stages/publicação
- [ ] Migrações para campos que forem aprovados (CNPJ, OPME, etc.)

---

## Frontend (consolidado)

### Checklist frontend

- [ ] Navegação lateral espelhando seções do mock
- [ ] Cada seção em componente lazy ou rota filha
- [ ] Estados salvos com feedback (toast) e tratamento de erro
- [ ] i18n para todas as strings

---

## Documentação relacionada

- [../column-editor-drag-drop.md](../column-editor-drag-drop.md)
- [../persistence-api-and-transitions.md](../persistence-api-and-transitions.md)
- [../frontend-backend-scope.md](../frontend-backend-scope.md)
- Conta/membros existentes: `src/features/account/`, `src/features/settings/`
