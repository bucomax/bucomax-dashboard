# Página: Relatórios

## Origem do mock

- **Arquivo:** [`arquivos-interfaces/relatorios.html`](../../../arquivos-interfaces/relatorios.html)
- **Foco:** métricas, gráficos (barras, pizza simulada), tabela de pacientes críticos, export PDF/Excel.

## Objetivo no produto

Visão **analítica** do tenant: indicadores no período, distribuição por fase/status/fluxo/OPME, lista acionável de casos críticos, **exportação** de dados.

---

## Rota sugerida

- `/[locale]/reports`

---

## Blocos de UI (mock → implementação)

| Bloco | Conteúdo | Implementação |
|-------|-----------|----------------|
| Cabeçalho | Título, subtítulo, Exportar PDF / Excel | `Button`; export real via API ou CSV client-side no MVP |
| Filtros | Período (7/30/90/365d), tipo de fluxo, OPME | `Select` + query params ou body em `POST` de relatório |
| Stats grid | Pacientes ativos, cirurgias realizadas/agendadas, tempo médio, críticos | `Card`; valores de API agregada |
| Gráfico pacientes por fase | Barras horizontais | `recharts` ou CSS + dados API; eixos = `PathwayStage` dinâmicos |
| Gráfico status | Pizza/ donut | distribuição ok/warning/danger |
| Gráfico por fluxo | Barras | group by `CarePathway` |
| Gráfico por OPME | Barras | group by fornecedor (gap OPME) |
| Tabela críticos | Nome, fase, dias, fluxo, status, Ver | `Table` + link para [page-patient-detail.md](./page-patient-detail.md) |

---

## Dados e agregações

| Métrica | Dependência de dados |
|---------|----------------------|
| Pacientes ativos | Contagem `PatientPathway` não “concluídos” (definir regra de conclusão: última etapa?) |
| Cirurgias realizadas / agendadas | **Gap:** eventos ou estágio específico + datas (`surgeryDate`) — mock usa campo fictício |
| Tempo médio (dias) | **Gap:** soma de permanências por etapa ou lead time total — precisa histórico com datas |
| Críticos | Mesma regra do dashboard (SLA) |
| Por fase | `GROUP BY currentStageId` |
| Por status | Derivado SLA |
| Por fluxo | `GROUP BY pathwayId` |
| Por OPME | `GROUP BY opmeSupplierId` (gap) |

---

## Backend

### Natureza dos endpoints

- Preferir **read-only** agregações em `GET /api/v1/reports/summary?from=&to=&pathwayId=&opmeId=`
- Resposta estruturada: `{ kpis, byStage[], byStatus{}, byPathway[], byOpme[], criticalPatients[] }`
- Autorização: tenant do usuário; possivelmente só `tenant_admin` para export completo (definir)

### Tabelas base

- `PatientPathway`, `Client`, `PathwayStage`, `CarePathway`, `StageTransition` (para métricas temporais futuras)

### Checklist backend

- [ ] Query eficiente (índices `(tenantId, …)`)
- [ ] Fuso horário explícito em ranges de data
- [ ] Endpoint export: CSV stream ou job assíncrono se volume alto
- [ ] PDF: biblioteca no servidor ou “imprimir” só no cliente no MVP

---

## Frontend

### Checklist frontend

- [ ] Sincronizar filtros com URL ou estado global
- [ ] Loading skeleton nos cards e gráficos
- [ ] Gráficos acessíveis (labels, contraste)
- [ ] “Ver todos” críticos → lista pré-filtrada em `/clients?status=danger`
- [ ] i18n

---

## Documentação relacionada

- [page-dashboard.md](./page-dashboard.md) (métricas podem compartilhar lógica)
- [../BUCOMAX-INTERFACES-AND-DATA.md](../../BUCOMAX-INTERFACES-AND-DATA.md) (gaps)
- [page-patients-list.md](./page-patients-list.md)
