# Skill: dashboard-kanban

Dashboard operacional com Kanban por etapa, resumo de pipeline, alertas SLA e relatórios.

**Usar quando:** dashboard, Kanban, pipeline, SLA alerts, reports, dashboard-summary.

## Arquitetura

- Feature: `src/features/dashboard/`.
- Tipo compartilhado: `src/types/dashboard-pipeline.ts`.

## Kanban

- Colunas = etapas publicadas do `CarePathway` selecionado.
- Cards = pacientes (`PatientPathway`) na etapa correspondente.
- API:
  - `GET /api/v1/pathways/[id]/kanban` — colunas com contagem de pacientes.
  - `GET /api/v1/pathways/[id]/kanban/columns/[stageId]/patients` — pacientes da coluna (paginado).

## Dashboard summary

- `GET /api/v1/pathways/[id]/dashboard-summary` — métricas agregadas por pathway:
  - Total de pacientes ativos.
  - Distribuição por etapa.
  - SLA health status.

## Dashboard alerts

- `GET /api/v1/pathways/[id]/dashboard-alerts` — pacientes em risco de SLA:
  - `sla_warning`: próximo do limite.
  - `sla_critical`: ultrapassou o limite.

## Reports

- `GET /api/v1/reports/summary` — relatório geral do tenant.
- Métricas: pacientes por pathway, por etapa, tempo médio por etapa, SLA compliance.

## SLA

- `PathwayStage.slaHours` define o prazo.
- `PatientPathway.enteredStageAt` marca entrada na etapa.
- Cálculo: `now - enteredStageAt > slaHours` → critical.
- Warning threshold: configurável (ex. 80% do SLA).

## Client visibility

- Kanban e dashboard respeitam `TenantMembershipClientScope`.
- `tenant_user` com restrição vê apenas pacientes atribuídos.
- Filtro aplicado via `buildClientVisibilityWhere()` em `src/lib/auth/client-visibility.ts`.
