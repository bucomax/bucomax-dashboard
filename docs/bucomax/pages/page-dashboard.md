# Página: Dashboard (pipeline + alertas)

## Origem do mock

- **Arquivo:** [`arquivos-interfaces/index.html`](../../../arquivos-interfaces/index.html)
- **Título no mock:** BucoMax — Sistema de Gestão de Pacientes / visão Dashboard.

## Objetivo no produto

Tela inicial operacional: **visão geral** (métricas), **alertas**, **ações rápidas**, **filtros**, **pipeline Kanban** por etapa, modais de **novo paciente** e **alterar fase** com preview de documentos.

---

## Rota e layout sugeridos (Next.js)

- **Rota:** `/[locale]/dashboard` (ou raiz autenticada do tenant), dentro de `AppShell` + sidebar existentes.
- **Layout:** não replicar header em gradiente do HTML; usar shell do projeto + `main` com `max-w-*` e espaçamento dos tokens.

---

## Blocos de UI (mock → componentes alvo)

| Bloco no mock | Componentes / padrões (projeto) |
|---------------|-----------------------------------|
| Nav superior com logo | Já coberto por `AppSidebar` / header do shell |
| Grid 4 stat cards (total, em dia, atenção, críticos) | `Card` + ícones `lucide-react`; clique pode setar filtro de status (query string ou estado) |
| Seção “Alertas ativos” | `Card` ou `Alert` variantes; lista de itens com CTA “Ver paciente” |
| Barra ações (Novo paciente, Relatórios, Exportar) | `Button`, `Link` para `/reports`, export chama API ou gera CSV no cliente |
| Filtros (busca, fluxo, status, OPME) | `Input`, `Select` (ou Combobox); reutilizar `src/shared/components/forms/form-select.tsx` se aplicável |
| Pipeline colunas + cards | Colunas **dinâmicas** conforme [../dashboard-kanban-dynamic-columns.md](../dashboard-kanban-dynamic-columns.md); `@dnd-kit` |
| Modal novo paciente | `Dialog`; campos alinhados ao wizard existente `new-client-wizard` ou extrair passos |
| Modal alterar fase | `Dialog`; lista de etapas + área preview documentos |
| Toast | `sonner` |

---

## Dados exibidos (conceituais)

| Dado | Origem desejada |
|------|------------------|
| Contagens por status (ok / warning / danger) | Derivado de SLA (dias na etapa) — exige `enteredStageAt` ou equivalente (gap) |
| Lista de alertas | Query agregada: pacientes acima de limiar por `PathwayStage`; alertas de convênio (gap) |
| Pacientes por coluna | `PatientPathway.currentStageId` agrupado por estágio; `Client` para nome/telefone |
| Filtro “fluxo” | `CarePathway.name` ou tipo (se modelado); hoje pode ser só pathway selecionado |
| Filtro OPME | Campo em `Client` ou tabela `OpmeSupplier` (gap) |
| Modal novo paciente | Nome, telefone, e-mail, tipo fluxo, OPME, responsável | ver gaps em `Client` / `User` |

---

## Backend

### Tabelas / models envolvidos

- Leitura: `PatientPathway`, `PathwayStage`, `PathwayVersion` (publicada), `CarePathway`, `Client`, `Tenant`
- Escrita: criação `Client` + início jornada (`PatientPathway`) no “Salvar paciente”; `StageTransition` + update `PatientPathway` na troca de fase / DnD

### Endpoints (exemplos a formalizar em `/api/v1`)

| Necessidade | Método | Notas |
|-------------|--------|--------|
| Kanban | `GET` agregado ou 2 chamadas: estágios publicados + lista pacientes com estágio | Ordenar estágios por `sortOrder` |
| Métricas / alertas | `GET` dedicado ou mesmo payload enriquecido | Depende de SLA persistido |
| Transição | `POST .../patient-pathways/:id/transition` | Mesmo use case para botão e DnD |
| Criar paciente + jornada | `POST .../clients` + `POST .../patient-pathways` ou onboarding único | Alinhar a wizard atual |

### Gaps de schema / regra

- `enteredStageAt` em `PatientPathway` (ou histórico) para “dias na fase”
- Limites de dias por etapa (`PathwayStage` metadata ou tabela SLA)
- OPME, e-mail, `assignedToUserId` em `Client` se ainda não existirem
- `StageDocument` + dispatch para “preview documentos” fiel ao mock

### Checklist backend

- [ ] Endpoint estágios publicados + pacientes por tenant
- [ ] Transição validada (mesma versão, tenant, estágio válido)
- [ ] Endpoint ou projeção para alertas (ou MVP sem alertas até SLA existir)
- [ ] Criação paciente alinhada ao fluxo multi-tenant existente

---

## Frontend

### Rotas / arquivos prováveis

- `src/features/dashboard/...` ou página em `src/app/[locale]/(dashboard)/dashboard/page.tsx`
- Componentes: `KanbanBoard`, `StatCards`, `AlertsSection`, `NewPatientDialog`, `ChangePhaseDialog`

### Estado e fetching

- TanStack Query (ou padrão do repo): chave `['kanban', tenantId, pathwayId]`
- Após transição: invalidar queries ou update otimista
- Filtros: estado local + `useMemo` ou query params

### Checklist frontend

- [ ] Shell + grid responsivo
- [ ] Kanban dinâmico (sem fases hardcoded)
- [ ] Modais integrados às APIs reais
- [ ] Acessibilidade DnD (`@dnd-kit`)
- [ ] i18n (`messages/*`) para strings da tela

---

## Documentação relacionada

- [../dashboard-kanban-dynamic-columns.md](../dashboard-kanban-dynamic-columns.md)
- [../persistence-api-and-transitions.md](../persistence-api-and-transitions.md)
- [../BUCOMAX-INTERFACES-AND-DATA.md](../../BUCOMAX-INTERFACES-AND-DATA.md) (gaps)
- Wizard atual: `src/features/clients/app/components/new-client-wizard.tsx`
