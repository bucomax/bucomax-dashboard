# Refatoração — src/features/

Plano de padronização das features do frontend conforme regras definidas em `.claude/rules/frontend-feature.md` e `.claude/rules/code-organization.md`.

---

## 1. Helpers de data/hora compartilhados

**Problema:** 15+ arquivos fazem `new Date().toLocaleString()`, `Intl.DateTimeFormat`, cálculos de dias em stage — tudo inline, sem reuso.

**Ação:** Criar `src/lib/utils/date.ts` com helpers centralizados:

| Helper | Responsabilidade | Arquivos que usam hoje (inline) |
|--------|------------------|--------------------------------|
| `formatDateTime(iso)` | `new Date(iso).toLocaleString("pt-BR", ...)` | client-detail-timeline-section, client-completed-treatments-section, client-detail-journey-panels, patient-portal-home-page |
| `formatDateShort(iso)` | Data curta dd/MM/yyyy | client-completed-treatments-section, dashboard-home-page |
| `calendarDaysFromNow(iso)` | Dias corridos desde uma data ISO | pipeline-kanban-drag-preview, pipeline-kanban-patient-card (duplicada) |
| `relativeTimeLabel(iso)` | "há 5 min", "há 2 dias" | notification-item (hook useRelativeTime inline) |

Depois: substituir chamadas inline por imports do helper.

---

## 2. Funções duplicadas

**Problema:** Mesma lógica copiada em dois arquivos — risco de divergência.

| Função | Arquivo A | Arquivo B | Destino |
|--------|-----------|-----------|---------|
| `calendarDaysInStage` | `dashboard/.../pipeline-kanban-drag-preview.tsx` | `dashboard/.../pipeline-kanban-patient-card.tsx` | `src/lib/utils/date.ts` |
| `stageDurationTone` | `dashboard/.../pipeline-kanban-drag-preview.tsx` | `dashboard/.../pipeline-kanban-patient-card.tsx` | `dashboard/app/utils/kanban.ts` |
| `resolveActionUrl` / `resolveNotificationUrl` | `notifications/.../notification-item.tsx` | `notifications/.../use-notifications.ts` | `notifications/app/utils/notification-url.ts` |

---

## 3. Funções utilitárias inline em componentes

Extrair para `<feature>/app/utils/` ou `src/lib/utils/` se reutilizável por mais de uma feature.

### clients

| Função | Arquivo atual | Destino |
|--------|--------------|---------|
| `stringField`, `boolField`, `numberField`, `stringArrayField` | `client-detail-timeline-section.tsx` | `clients/app/utils/record-fields.ts` |
| `lineForItem` | `client-detail-timeline-section.tsx` | `clients/app/utils/timeline-line.ts` |
| `waDigits` | `client-detail-view.tsx` | `src/lib/utils/phone.ts` (ou reusar `digitsOnlyPhone` de `src/lib/validators/phone`) |
| `uniqueActors` | `client-completed-treatments-section.tsx` | `clients/app/utils/treatments.ts` |
| `normNullable` | `client-detail-profile-card.tsx` | `src/lib/utils/string.ts` |
| `assigneeDisplayName` | `client-detail-assignee-overview-card.tsx` | `clients/app/utils/assignee.ts` |
| `collectRhfErrorMessages` | `patient-self-register-page.tsx` | `src/lib/utils/form.ts` (compartilhado) |
| `scrollFirstInvalidFieldIntoView` | `patient-self-register-page.tsx` | `src/lib/utils/form.ts` (compartilhado) |

### dashboard

| Função | Arquivo atual | Destino |
|--------|--------------|---------|
| `calendarDaysInStage` | (ver seção 2 — duplicada) | `src/lib/utils/date.ts` |
| `stageDurationTone` | (ver seção 2 — duplicada) | `dashboard/app/utils/kanban.ts` |

### notifications

| Função | Arquivo atual | Destino |
|--------|--------------|---------|
| `resolveActionUrl` | (ver seção 2 — duplicada) | `notifications/app/utils/notification-url.ts` |
| `alertUserOfNotification` | `use-notifications.ts` | `notifications/app/utils/notification-alert.ts` |
| `useRelativeTime` (hook) | `notification-item.tsx` | `notifications/app/hooks/use-relative-time.ts` (refatorar para usar `relativeTimeLabel` de `src/lib/utils/date.ts`) |

### auth

| Função | Arquivo atual | Destino |
|--------|--------------|---------|
| `normalizeCallbackPath` | `use-login-form.ts` | `auth/app/utils/callback-path.ts` |

### patient-portal

| Função | Arquivo atual | Destino |
|--------|--------------|---------|
| `formatLoginDisplay` | `patient-portal-login-page.tsx` | `patient-portal/app/utils/login-display.ts` |

### settings

| Função | Arquivo atual | Destino |
|--------|--------------|---------|
| `sectionFromHash` | `settings-page-layout.tsx` | `settings/app/utils/section-hash.ts` |

---

## 4. Estrutura de pastas por feature

### 4.1 `types/` na raiz em vez de `app/types/`

Algumas features têm `types/` como filho direto de `src/features/<nome>/` em vez de `src/features/<nome>/app/types/`. Avaliar e mover.

| Feature | Atual | Esperado |
|---------|-------|----------|
| clients | `clients/types/` | `clients/app/types/` |
| dashboard | `dashboard/types/` | `dashboard/app/types/` |
| notifications | `notifications/types/` | `notifications/app/types/` |
| pathways | `pathways/types/` | `pathways/app/types/` |
| settings | `settings/types/` | `settings/app/types/` |

### 4.2 Pastas faltantes

| Feature | Falta |
|---------|-------|
| notifications | `app/utils/` |
| legal | `app/utils/`, `app/types/` (feature pequena — criar se necessário) |

### 4.3 Pastas fora do padrão

| Feature | Pasta extra | Ação |
|---------|-------------|------|
| pathways | `app/constants/` | Mover conteúdo para `app/utils/` ou `src/lib/constants/` |
| patient-portal | `app/context/` | Avaliar se pode virar hook ou se justifica existir |

---

## 5. Ordem de execução sugerida

Prioridade por impacto e risco:

1. **`src/lib/utils/date.ts`** — criar helpers e substituir em 15+ arquivos (maior impacto, elimina duplicatas)
2. **Funções duplicadas** (seção 2) — risco real de bugs por divergência
3. **Funções inline de `clients/`** — maior volume (8 funções)
4. **Funções inline restantes** — notifications, auth, patient-portal, settings
5. **Mover `types/` para `app/types/`** — mecânico, baixo risco
6. **Ajustar pastas extras** — pathways/constants, patient-portal/context

---

## Regras de referência

- `.claude/rules/frontend-feature.md` — estrutura de feature, responsabilidades
- `.claude/rules/code-organization.md` — onde colocar tipos, utils, constantes
- `docs/FRONTEND-FEATURES.md` — guia de criação de features
