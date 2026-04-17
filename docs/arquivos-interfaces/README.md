# Interfaces de referência (HTML estático)

Protótipos **BucoMax** usados como referência visual e de fluxo para o painel Next.js do monorepo.

| Arquivo | Conteúdo |
|---------|----------|
| `index.html` | Dashboard: métricas, alertas, pipeline Kanban, modais (novo paciente / alterar fase) |
| `pacientes.html` | Lista em cards ou tabela, filtros, paginação |
| `paciente.html` | Detalhe do paciente: timeline, checklist, documentos, atividades, notas |
| `interface-paciente-detalhe.html` | Variante de detalhe com timeline expandida e modal de avanço + PDFs |
| `configuracoes.html` | Configurações: perfil, clínica, **fases** (SLA/dias), notificações, equipe, OPME, integrações |
| `relatorios.html` | Relatórios, gráficos e exportação |

## Documentação técnica no repositório

- **Índice Bucomax:** [`docs/bucomax/README.md`](../docs/bucomax/README.md)  
- **Uma doc por página desta pasta (migração FE/BE):** [`docs/bucomax/pages/README.md`](../docs/bucomax/pages/README.md)  
- **Matriz modelo Prisma × páginas:** [`docs/bucomax/pages/entity-to-pages-matrix.md`](../docs/bucomax/pages/entity-to-pages-matrix.md)  
- **Migrations (o que criar no banco):** [`docs/bucomax/database-backlog.md`](../docs/bucomax/database-backlog.md)  
- **Ordem de execução / primeira etapa:** [`docs/bucomax/execution-plan.md`](../docs/bucomax/execution-plan.md)  
- Referência visual, tema e gaps gerais: [`docs/BUCOMAX-INTERFACES-AND-DATA.md`](../docs/BUCOMAX-INTERFACES-AND-DATA.md)
