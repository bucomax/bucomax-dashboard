# Bucomax — interfaces de referência (`arquivos-interfaces`) × dados × UI

> **Índice unificado do produto Bucomax (colunas DnD + dashboard):** [`docs/bucomax/README.md`](./bucomax/README.md) — aponta para todos os documentos por parte.  
> **O que cada entrega exige de front e de back:** [`docs/bucomax/frontend-backend-scope.md`](./bucomax/frontend-backend-scope.md).  
> **Doc detalhada por página do mock (`arquivos-interfaces`):** [`docs/bucomax/pages/README.md`](./bucomax/pages/README.md).

Este documento deriva dos protótipos HTML em [`arquivos-interfaces/`](../arquivos-interfaces/) e alinha com o **tema existente** do painel Next.js (`src/app/globals.css`, tokens Shadcn/Tailwind, componentes em `src/shared/components/ui`) e com o **modelo de jornada** já previsto no repositório (`CarePathway`, `PathwayVersion`, `PathwayStage`, `PatientPathway`, `StageTransition` — ver `docs/ARCHITECTURE.md`).

---

## 1. Kanban, configuração de fases e ferramentas de UI

**Decisão atual do produto:** o **cadastro de fases** em Configurações usa **apenas drag-and-drop** para criar e ordenar **colunas** (lista de etapas). O **dashboard** exibe as colunas conforme essa configuração publicada. Detalhes de implementação: [`docs/bucomax/README.md`](./bucomax/README.md).

| Onde | O que a UI faz | Implementação |
|------|----------------|---------------|
| **Configurações → Fases** | Definir etapas como colunas, ordem dinâmica | **Lista ordenável (DnD)** — sem `@xyflow/react` nesta tela. Ver [bucomax/column-editor-drag-drop.md](./bucomax/column-editor-drag-drop.md). |
| **Dashboard** — pipeline | Colunas + cards + DnD entre colunas | **Kanban** alimentado por `PathwayStage` da versão publicada, ordem = `sortOrder`. Ver [bucomax/dashboard-kanban-dynamic-columns.md](./bucomax/dashboard-kanban-dynamic-columns.md). |
| **Detalhe do paciente** — linha do tempo | Timeline linear | Somente leitura a partir de `PathwayStage.sortOrder` + `PatientPathway` + `StageTransition`. |

**Nota:** `@xyflow/react` permanece útil se no futuro existir **editor de grafo** (ramificações, nós especiais); para o escopo **colunas via DnD**, não é obrigatório. Persistência e API: [bucomax/persistence-api-and-transitions.md](./bucomax/persistence-api-and-transitions.md).

---

## 2. Tema visual: protótipo vs app atual

### 2.1 O que o mock usa

- **Primária**: azul `#2563eb` / `#1d4ed8`, fundo cinza `#f3f4f6`, cards brancos, raios ~8–12px, sombras leves.
- **Semântica**: verde (ok), âmbar (atenção), vermelho (crítico) — alinhado a `success` / `warning` / `danger` do HTML.

### 2.2 O que o app usa hoje

- Tokens CSS em `:root` / `.dark` (`--primary`, `--card`, `--muted`, `--destructive`, etc.) e classes Tailwind (`bg-card`, `text-muted-foreground`, `rounded-lg`, `Button`, `Card`, `Badge`, etc.).

### 2.3 Como montar a interface “no nosso tema”

- **Não copiar** o header em gradiente azul do mock como padrão; usar **`AppShell` / sidebar** já existentes e **cards + badges** Shadcn.
- Mapear estados do mock para componentes reutilizáveis:
  - **Cards de métrica** → `Card` + ícone `lucide-react` + tipografia `text-muted-foreground` para subtítulo.
  - **Badges de fluxo / fase / OPME** → `Badge` com variantes ou `className` usando `bg-primary/10 text-primary` (ou cor de gráfico `chart-*` se quiser distinguir categorias).
  - **Status ok | warning | danger** → combinação `Badge` + borda lateral no card (`border-l-4 border-l-emerald-500` / `amber-500` / `red-500`) como no mock.
  - **Modais** → `Dialog` do shadcn; **toasts** → `sonner` (já importado no projeto).
- Se a marca Bucomax **exigir azul** como no HTML de referência, ajustar **só** `--primary` (e derivados) em `globals.css` para manter um único sistema de tokens; evitar hex soltos nos novos ecrãs.

---

## 3. Inventário por arquivo (mock) → entidades e telas Next

### 3.1 `index.html` — Dashboard

| Bloco UI | Dados necessários | Origem no banco (atual ou planejada) |
|----------|-------------------|--------------------------------------|
| Cards: total / em dia / atenção / críticos | Contagens por `PatientPathway` + regra de SLA | Agregações sobre pacientes ativos; SLA abaixo |
| Alertas ativos | Pacientes acima do limite de dias na etapa; alertas de convênio (mock) | Transição + `enteredStageAt` (ver gap §4); tabela ou campo de prazo convênio |
| Filtros: busca, fluxo, status, OPME | Nome/telefone/cliente; tipo de jornada; SLA; fornecedor | `Client`; `CarePathway` ou classificação; derivado; `OpmeSupplier` (gap) |
| Pipeline Kanban | Lista de pacientes por `currentStageId` | `PatientPathway` + `PathwayStage` |
| Modal novo paciente | Nome, WhatsApp, e-mail, tipo de fluxo, OPME, responsável | `Client` + escolha de `CarePathway` + extensões (gap) |
| Modal alterar fase + preview de documentos | Destino + lista de PDFs da etapa | `StageTransition` + pacote `StageDocument` / `File` (arquitetura; ver gap) |

### 3.2 `pacientes.html` — Lista

| Bloco UI | Dados | Notas |
|----------|--------|--------|
| Grid / tabela, paginação, filtros | Mesma base do dashboard | Rota dedicada `/clients` ou `/patients`; alinhar vocabulário com `Client` |
| Colunas: fase, dias, OPME, status | `currentStage`, `daysInStage`, join OPME, SLA | Dias na etapa exige timestamp (gap) |

### 3.3 `paciente.html` / `interface-paciente-detalhe.html` — Detalhe

| Bloco UI | Dados | Origem / gap |
|----------|--------|----------------|
| Cabeçalho, contato, ações | Cliente + jornada + responsável | `Client`, `PatientPathway`, `User` |
| Linha do tempo | Ordem das etapas + atual + datas | `PathwayStage.sortOrder`, `StageTransition`, `enteredStageAt` (gap) |
| Checklist da fase | Itens + conclusão por paciente | Templates por etapa + progresso — **não existe** no Prisma atual (gap §4) |
| Documentos enviados / status | Nome, data, enviado/visualizado/pendente | `ChannelDispatch` / ligação documento–etapa (arquitetura §8) |
| Atividades recentes | Eventos | `StageTransition` + futuros webhooks; ou `ActivityLog` (gap) |
| Anotações | Texto livre | `Client.caseDescription` curto hoje; ideal `PatientNote` ou campo longo (gap) |
| Modal confirmar avanço + lista de PDFs | Igual ao dashboard | Mesmo contrato da transição |

### 3.4 `configuracoes.html` — Configurações

| Seção | Conteúdo do mock | Mapeamento |
|-------|-------------------|------------|
| Perfil | Nome, CRO, e-mail, telefone, especialidade | `User` + metadados (perfil clínico pode ser JSON ou tabela `UserProfile` / `Tenant`) |
| Clínica | Nome, CNPJ, endereço, hospitais | `Tenant` estendido ou `TenantSettings` (gap) |
| **Fases do Tratamento** | Limite de dias por fase, contagem de documentos | Metadados por `PathwayStage`; **ordem e colunas** via **editor DnD** — [bucomax/column-editor-drag-drop.md](./bucomax/column-editor-drag-drop.md) |
| Notificações | Toggles | `TenantSettings` / preferências por usuário (gap) |
| Equipe | Lista, papéis | `TenantMembership` + `User` (já existe) |
| Fornecedores OPME | CRUD, contagem de pacientes | `OpmeSupplier` + FK em `Client` ou tabela de vínculo (gap) |
| Integrações | WhatsApp, calendário, etc. | Flags em `Tenant`; integrações reais fora do escopo mínimo |

### 3.5 `relatorios.html` — Relatórios

| Métrica / gráfico | Dados | Implementação |
|-------------------|--------|----------------|
| Pacientes ativos, cirurgias, agendadas, tempo médio, críticos | Agregações | Views ou queries; “cirurgia agendada” exige modelo de evento/campo (gap) |
| Por fase / status / fluxo / OPME | group by | SQL/Prisma groupBy + API dedicada |
| Export CSV/PDF | Mesmas queries | Endpoint export + UI |

---

## 4. O que já existe no Prisma (referência rápida)

- **`Tenant`**, **`User`**, **`TenantMembership`** — multi-tenant e equipe.
- **`Client`** — `name`, `phone`, `caseDescription`, `documentId` (CPF ou similar); **falta** e-mail, tipo de fluxo explícito, OPME, responsável, notas longas.
- **`CarePathway`**, **`PathwayVersion`** (`graphJson`), **`PathwayStage`** (`stageKey`, `name`, `sortOrder`, `patientMessage`).
- **`PatientPathway`** — vínculo cliente + versão + **`currentStageId`**.
- **`StageTransition`** — auditoria de mudança (`fromStageId`, `toStageId`, `actorUserId`, `note`, `dispatchStub`).
- **`FileAsset`** — arquivos R2 ligados ao tenant (e opcionalmente `clientId`).

**Observação:** o modelo **`StageDocument`** citado na arquitetura (documentos por etapa) **ainda não aparece** no `schema.prisma` atual; para espelhar o mock (“documentos automáticos” / preview no modal), será preciso **adicionar** tabelas ou relações conforme a §8 de `ARCHITECTURE.md`.

---

## 5. Gaps de banco sugeridos (para cobrir os mocks)

**Lista consolidada com prioridades P0–P3 e tabelas:** [`docs/bucomax/database-backlog.md`](./bucomax/database-backlog.md).

Resumo histórico (nomes indicativos; validar com produto e LGPD):

1. **`enteredStageAt` em `PatientPathway`** (ou tabela de estado derivado) — para calcular **dias na fase** e alertas “>7 / >15 dias”.
2. **Metadados de SLA por etapa** — ex.: `PathwayStage.metadata` (JSON) com `alertWarningDays`, `alertCriticalDays`, ou tabela `PathwayStageSla`.
3. **`OpmeSupplier`** (`tenantId`, `name`, `active`) + **`Client.opmeSupplierId`** (opcional).
4. **`Client`**: `email`, `assignedToUserId` (responsável), talvez `carePathwayId` escolhido no onboarding.
5. **Checklist**: `PathwayStageChecklistItem` (template por etapa) + `PatientChecklistItem` (progresso por `PatientPathway`).
6. **`PatientNote`** ou campo `notes` em `Client` / jornada — histórico opcional com `createdAt` / `authorId`.
7. **`TenantClinicSettings`** (CNPJ, endereço, texto hospitais) — separar dados legais da marca do `Tenant.name/slug`.
8. **Alertas de convênio** (mock: “prazo do convênio em 5 dias”) — `Client` ou entidade `InsuranceAuthorization` com `expiresAt`.

Cada novo dado sensível deve seguir as regras de **tenantId** e minimização de logs (LGPD).

---

## 6. Editor de fases (atual: DnD de colunas)

O fluxo principal de configuração está documentado em [**bucomax/column-editor-drag-drop.md**](./bucomax/column-editor-drag-drop.md) e [**bucomax/persistence-api-and-transitions.md**](./bucomax/persistence-api-and-transitions.md).

### 6.1 Se no futuro houver editor com `@xyflow/react`

- **Fonte de verdade** do desenho poderia ser `PathwayVersion.graphJson` (nodes/edges).
- Publicação sincronizaria `PathwayStage`; arestas definiriam caminhos ramificados.
- Para o MVP só com lista DnD, ver `graphJson` enxuto ou derivado na doc de persistência.

### 6.2 Mock (dias / documentos)

- “Documentos automáticos” / “alerta após N dias” → `StageDocument` (quando existir no schema) ou metadados em `PathwayStage` / SLA (§5).

---

## 7. APIs e casos de uso (alto nível)

- **Listar pacientes no Kanban**: filtrar `PatientPathway` por `tenantId`, incluir `client`, `currentStage`, `pathwayVersion`.
- **Transição** (botão, modal ou drag): caso de uso único `TransitionPatientStage` — valida aresta ou próxima etapa, persiste `PatientPathway`, grava `StageTransition`, dispara pacote de documentos / WhatsApp (pipeline existente em evolução).
- **Editor de fases (DnD)**: salvar rascunho da lista ordenada de etapas; **publicar** persiste `PathwayStage` + `sortOrder` (ver [bucomax/persistence-api-and-transitions.md](./bucomax/persistence-api-and-transitions.md)).
- **Relatórios**: endpoints de agregação somente leitura com mesmos filtros do mock.

---

## 8. Referências no repositório

- **Índice Bucomax:** [`docs/bucomax/README.md`](./bucomax/README.md)
- Protótipos: [`arquivos-interfaces/`](../arquivos-interfaces/)
- Arquitetura e §8 modelo de dados: [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)
- Tema e componentes: `src/app/globals.css`, `src/shared/components/ui/`, layout `src/shared/components/layout/app-shell.tsx`

---

*Documento gerado para alinhar o escopo visual dos HTMLs de referência com o backend e o design system já adotados; revisar após cada migração Prisma relevante.*
