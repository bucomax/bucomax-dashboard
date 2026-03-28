# Plano de execução — ordem de desenvolvimento

Este documento responde: **o que desenvolver primeiro?** e em que sequência atacar **back + front**, alinhado a [frontend-backend-scope.md](./frontend-backend-scope.md) e ao backlog de banco [database-backlog.md](./database-backlog.md).

---

## Resposta direta: a primeira etapa

**Etapa 1 (primeira a desenvolver): núcleo de dados + API da jornada publicada + transição**

Motivo: sem **estágios publicados** ordenados e **transição** estável, nenhuma tela tipo dashboard ou lista reflete a verdade do negócio. O front depende desse contrato.

Concretamente, começar por:

1. **Migrations P0** do [database-backlog.md](./database-backlog.md) (`enteredStageAt` + SLA por etapa), **ou** um MVP ainda mais enxuto só com o que já existe no schema, aceitando que “dias na fase” e alertas ficam placeholder até P0.  
2. **Use cases + rotas:** publicar versão / sincronizar `PathwayStage` + `sortOrder`; `GET` estágios publicados; `GET` pacientes agrupados ou lista com estágio; `POST` transição.  
3. Só então **editor DnD** (config) e **Kanban** (dashboard) em paralelo ou config antes do dashboard, conforme preferência de time (ver fases abaixo).

---

## Fases de entrega (ordem sugerida)

### Fase 0 — Fundação (back primeiro)

| # | Entrega | Back | Front |
|---|---------|------|-------|
| 0.1 | Migrations acordadas (mínimo: aceitar schema atual; ideal: **P0** backlog) | Prisma migrate | — |
| 0.2 | Listar `PathwayStage` da versão **publicada** por `carePathwayId` | `GET` + tenant guard | — |
| 0.3 | Publicar versão / reorder stages | `PUT` stages + `POST` publish (transação) | — |
| 0.4 | Transição de paciente | `TransitionPatientStage` + `StageTransition`; atualizar `currentStageId` e `enteredStageAt` se campo existir | — |

**Critério de saída:** Postman/cURL ou teste de integração passando para publicar, listar estágios e transicionar.

---

### Fase 1 — Configurações: editor de fases (DnD)

| # | Entrega | Back | Front |
|---|---------|------|-------|
| 1.1 | API rascunho + publicação (se ainda não coberto na 0) | Completa CRUD ordenado de stages na versão draft | — |
| 1.2 | Tela editor colunas | — | Lista `@dnd-kit`, salvar, publicar, feedback |

**Doc:** [column-editor-drag-drop.md](./column-editor-drag-drop.md) · **Página:** [pages/page-settings.md](./pages/page-settings.md) (seção fases).

---

### Fase 2 — Dashboard Kanban

| # | Entrega | Back | Front |
|---|---------|------|-------|
| 2.1 | Payload agregado Kanban (stages + pacientes por coluna) | `GET` dedicado ou composição | — |
| 2.2 | UI Kanban dinâmico + DnD entre colunas | Usa transição da Fase 0 | `@dnd-kit` multi-container |

**Doc:** [dashboard-kanban-dynamic-columns.md](./dashboard-kanban-dynamic-columns.md) · **Página:** [pages/page-dashboard.md](./pages/page-dashboard.md).

---

### Fase 3 — Pacientes: lista e detalhe

| # | Entrega | Back | Front |
|---|---------|------|-------|
| 3.1 | Lista paginada + filtros | `GET /clients` enriquecido | Grid/tabela |
| 3.2 | Detalhe + timeline + transição | `GET` detalhe + mesmo `POST` transição | Página `[clientId]` |

**Páginas:** [page-patients-list.md](./pages/page-patients-list.md), [page-patient-detail.md](./pages/page-patient-detail.md).  
**Migrations P1** (email, OPME, responsável) podem entrar nesta fase conforme prioridade.

---

### Fase 4 — Configurações restantes + relatórios

| # | Entrega | Notas |
|---|---------|--------|
| 4.1 | Settings: clínica, notificações, OPME, integrações | Depende de P1/P3 do [database-backlog.md](./database-backlog.md) |
| 4.2 | Relatórios + export | Agregações read-only; [page-reports.md](./pages/page-reports.md) |

---

### Fase 5 — P2/P3 (documentos, checklist, notas, convênio)

Conforme arquitetura e produto; desbloqueia paridade total com mocks.

---

## Paralelização

- **Back Fase 0** pode rodar à frente; **Front Fase 1** precisa só de contrato estável (tipos OpenAPI/Zod compartilhados).  
- **Lista de pacientes (Fase 3)** pode começar depois de existir `GET clients` mínimo, **em paralelo** ao Kanban se houver duas pessoas.

---

## Checklist rápido “estamos prontos para a próxima fase?”

- [ ] **Fase 0:** publicar + listar stages + transição testados  
- [ ] **Fase 1:** ordem no editor = ordem no `GET` publicado  
- [ ] **Fase 2:** colunas batem com config; DnD chama mesma API que botão  
- [ ] **Fase 3:** deep link detalhe; sem vazamento cross-tenant  

---

## Índice geral

- [README.md](./README.md)  
- [database-backlog.md](./database-backlog.md)  
- [pages/README.md](./pages/README.md)
