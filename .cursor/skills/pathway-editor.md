# Skill: pathway-editor

Editor visual de fluxos clínicos usando @xyflow/react com persistência de graphJson e sincronização de etapas.

**Usar quando:** editor de pathway, @xyflow/react, graphJson, publicação de versão, stages, StageDocument, drag-and-drop de etapas.

## Arquitetura do editor

- Componente principal: `src/features/pathways/app/components/pathway-editor.tsx`.
- Feature: `src/features/pathways/`.
- Lib helpers: `src/lib/pathway/` — operações no grafo (graph JSON, nodes, edges).

## Modelo de dados

- **`CarePathway`** — fluxo de cuidado do tenant (nome/slug únicos).
- **`PathwayVersion`** — versão do fluxo:
  - `graphJson`: JSON compatível com @xyflow/react (`{ nodes: Node[], edges: Edge[] }`).
  - `published`: flag de publicação.
  - `publishedAt`: timestamp.
- **`PathwayStage`** — etapa materializada da versão:
  - `stageKey`: identificador único dentro da versão.
  - `name`, `sortOrder`, `patientMessage`.
  - `slaHours`: prazo SLA da etapa.
  - `defaultAssigneeUserIds`: array de usuários padrão.
- **`StageDocument`** — documento da etapa (`fileAssetId`, `sortOrder`).
- **`PathwayStageChecklistItem`** — item de checklist da etapa (`requiredForTransition`).

## Fluxo de save/publish

1. **Save draft** — `SavePathwayGraph` use case:
   - Salva `graphJson` na `PathwayVersion` (draft).
   - Sincroniza nodes de tipo etapa → `PathwayStage` (create/update/delete).
   - Sincroniza `StageDocument` e `PathwayStageChecklistItem`.
2. **Publish** — `PublishPathwayVersion` use case:
   - Marca `published = true`, `publishedAt = now`.
   - Preview: `GET /pathways/[id]/versions/[versionId]/publish-preview` — mostra impacto.
   - Publicação: `POST /pathways/[id]/versions/[versionId]/publish`.
   - Política de migração de pacientes em versões anteriores.

## Stage metadata

Cada stage node no editor pode configurar:
- Nome e descrição.
- Mensagem para o paciente (`patientMessage`).
- SLA em horas (`slaHours`).
- Assignees padrão (`defaultAssigneeUserIds`).
- Documentos da etapa (`StageDocument[]` com `sortOrder`).
- Checklist items (`PathwayStageChecklistItem[]` com `requiredForTransition`).

## APIs relacionadas

- `GET /api/v1/pathways` — listar fluxos do tenant.
- `POST /api/v1/pathways` — criar fluxo.
- `GET /api/v1/pathways/[id]/versions` — versões do fluxo.
- `GET/PATCH /api/v1/pathways/[id]/versions/[versionId]` — ler/salvar versão (graphJson).
- `POST /api/v1/pathways/[id]/versions/[versionId]/publish` — publicar.
- `GET /api/v1/pathways/[id]/published-stages` — etapas publicadas (para Kanban, transição).

## @xyflow/react

- React 19 compatível.
- Estado: `useNodesState`, `useEdgesState` do @xyflow/react.
- Serialização: `graphJson` salvo como JSON no banco.
- Custom nodes: nodes com metadata de etapa (nome, docs, checklist).
- Persistir `{ nodes, edges }` como está — não transformar para formato proprietário.
