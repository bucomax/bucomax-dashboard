# Migração por página (`arquivos-interfaces` → app Next)

## Organização escolhida: **uma doc por página (feature)**

- **Por quê não só “por tabela do banco”:** uma tela costuma cruzar várias entidades (`Client` + `PatientPathway` + `PathwayStage` + …). Documentar **por página** espelha o trabalho de migração (rota → UI → APIs → persistência) e, **dentro de cada doc**, listamos **tabelas e endpoints** envolvidos.
- **Relação com outras docs:** fluxos transversais (editor DnD de fases, Kanban dinâmico, publicar versão) continuam em [../column-editor-drag-drop.md](../column-editor-drag-drop.md), [../dashboard-kanban-dynamic-columns.md](../dashboard-kanban-dynamic-columns.md) e [../persistence-api-and-transitions.md](../persistence-api-and-transitions.md). As páginas abaixo **consomem** esses fluxos onde couber.

---

## Índice: mock → documento → rota sugerida

| Mock (`arquivos-interfaces/`) | Documento | Rota sugerida (exemplo) |
|-------------------------------|-------------|-------------------------|
| `index.html` | [page-dashboard.md](./page-dashboard.md) | `/[locale]/dashboard` ou home do painel |
| `pacientes.html` | [page-patients-list.md](./page-patients-list.md) | `/[locale]/clients` (ou `/patients`) |
| `paciente.html` + `interface-paciente-detalhe.html` | [page-patient-detail.md](./page-patient-detail.md) | `/[locale]/clients/[clientId]` |
| `configuracoes.html` | [page-settings.md](./page-settings.md) | `/[locale]/settings` (+ subseções) |
| `relatorios.html` | [page-reports.md](./page-reports.md) | `/[locale]/reports` |

**Visão por entidade Prisma (quem toca cada tabela):** [entity-to-pages-matrix.md](./entity-to-pages-matrix.md)

---

## Modelo Prisma já existente (referência rápida)

| Tabela / model | Uso típico nas páginas |
|----------------|-------------------------|
| `Tenant`, `User`, `TenantMembership` | Todas (contexto, equipe, RBAC) |
| `Client` | Lista/detalhe paciente, modais cadastro |
| `CarePathway`, `PathwayVersion`, `PathwayStage` | Dashboard Kanban, config fases, detalhe (timeline) |
| `PatientPathway` | Posição do paciente na jornada |
| `StageTransition` | Histórico / atividades |
| `FileAsset` | Documentos anexos (quando ligados ao cliente) |

Modelos citados na arquitetura mas **ainda não no `schema.prisma`** (gaps): `StageDocument`, `ChannelDispatch`, checklist por etapa, OPME, SLA — cada página doc marca o que falta.

---

## Front × Back

Em **cada** arquivo `page-*.md` há seções **Frontend** e **Backend** com checklist. Visão geral: [../frontend-backend-scope.md](../frontend-backend-scope.md).

---

## Índice principal Bucomax

- [../README.md](../README.md) — hub geral  
- [../database-backlog.md](../database-backlog.md) — migrations Prisma  
- [../execution-plan.md](../execution-plan.md) — ordem de desenvolvimento (**primeira etapa**)
