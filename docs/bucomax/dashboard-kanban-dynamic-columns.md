# B — Dashboard: Kanban com colunas da configuração

## Objetivo

O **dashboard** (visão pipeline) deve:

1. **Carregar as colunas** a partir da **versão publicada** do `CarePathway` ativo (ou fluxo selecionado no contexto do tenant).  
2. Renderizar **uma coluna por `PathwayStage`**, na ordem de **`sortOrder`** (a mesma definida pelo editor DnD em Configurações).  
3. Em cada coluna, listar **cards de pacientes** cujo `PatientPathway.currentStageId` corresponde àquela etapa.

Nada de lista fixa de fases no frontend: a **fonte de verdade** é o que foi configurado e publicado.

### Frontend e backend

O Kanban depende de **APIs** que devolvem colunas + pacientes e de **transição** no back. Ver tabela **Parte B** em [frontend-backend-scope.md](./frontend-backend-scope.md).

---

## Fluxo de dados

```text
GET stages (pathway + published version)
  → ordenar por sortOrder
  → para cada stage: query patients com currentStageId = stage.id
```

- Filtros globais (busca, fluxo, status, OPME) aplicam-se à **lista de pacientes** antes ou depois do agrupamento, conforme performance.  
- Estatísticas do topo (totais, alertas) derivam dos mesmos dados ou de agregações dedicadas.

---

## Drag-and-drop no dashboard

- **Arrastar card entre colunas** = **transição de etapa** para o `PathwayStage` da coluna de destino.  
- Deve chamar o **mesmo caso de uso** que o botão “Avançar” / modal de troca de fase: validação de tenant, versão, etapa pertencente ao `pathwayVersionId` do paciente, auditoria `StageTransition`, dispatch de documentos quando existir.

Recomendação: **@dnd-kit** com múltiplos contêineres (`Droppable` por coluna) para manter paridade com o editor de configurações.

---

## Estados de UI

- **Carregamento:** skeleton por coluna.  
- **Coluna vazia:** empty state discreto (“Nenhum paciente nesta etapa”).  
- **Erro de API:** toast + retry; não quebrar layout das colunas.  
- **Múltiplos fluxos no tenant:** se o produto exigir escolha de `CarePathway`, seletor no dashboard filtra qual conjunto de colunas exibir (alinhado à regra já descrita em `multi-tenant-journey`: um fluxo auto, vários fluxos escolha explícita).

---

## Critérios de aceite

- [ ] Número e títulos das colunas batem com Configurações após publicação.  
- [ ] Ordem horizontal (ou vertical em mobile) segue `sortOrder`.  
- [ ] Mover card entre colunas dispara transição válida ou mostra erro de domínio.  
- [ ] Não há array hardcoded de fases tipo `avaliacao`, `exames`, etc.

---

## Relacionado

- [README.md](./README.md) — índice.  
- [column-editor-drag-drop.md](./column-editor-drag-drop.md) — origem da ordem das colunas.  
- [persistence-api-and-transitions.md](./persistence-api-and-transitions.md) — contratos e transição.
