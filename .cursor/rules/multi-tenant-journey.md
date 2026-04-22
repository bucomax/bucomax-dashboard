# Regra: multi-tenant-journey

Aplica-se a **todos os arquivos** do projeto.

## Vocabulário do domínio

- **`PathwayTemplate`** (plataforma) — jornadas padrão clonáveis (ex.: sequência cirúrgica típica).
- **`CarePathway`** — vários por `tenantId`; nome/slug únicos no tenant.
- **`PathwayVersion`** — `graphJson` (@xyflow/react: `nodes`, `edges`) persistido + `PathwayStage` sincronizado.
- **`PathwayStage`** — etapa materializada com `stageKey`, nome, `sortOrder`, SLA, checklist, documentos.
- **`StageDocument`** — documento vinculado à etapa (N:N com `FileAsset` via `sortOrder`).
- **`PatientPathway`** — instância da jornada do paciente (`currentStageId`, `enteredStageAt`).
- **`StageTransition`** — registro histórico de mudança de etapa com `dispatchStub`.
- **`ChannelDispatch`** — resultado do envio ao canal (WhatsApp).
- **`Client`** — paciente na clínica (nome, telefone, caso, documentId).

## Ordem operacional

1. **Cadastro** `Client` — WhatsApp, nome, descrição do caso, etc.
2. **Escolha de fluxo** — `StartPatientPathway` (se 1 fluxo no tenant, auto).
3. **Próximas etapas** — `TransitionPatientStage` (repetível).

## UX: escolha de fluxo

- **Mais de um** `CarePathway` publicado → UI **obriga escolher** o fluxo; API recebe `pathwayId` explícito.
- **Exatamente um** fluxo → associação automática (sem passo de escolha).

## Editor de fluxos

- Usar `@xyflow/react`; estado serializado compatível com `PathwayVersion.graphJson`.
- Ao salvar/publicar, sincronizar etapas (nodes de tipo etapa) com `PathwayStage` e `StageDocument`.

## Pacote de documentos

- Ao **entrar** na etapa: `documents[]` completo via `StageDocument` ordenado por `sortOrder`.
- Todos os documentos da etapa são entregues — regra de produto.

## Transição de etapa

- `toStageId` deve pertencer ao mesmo `pathwayVersionId` do paciente.
- Pipeline: transição → bundle → `ChannelDispatch` (+ IA opcional).
- `correlationId` para idempotência.
- Lock distribuído para concorrência.
- Checklist obrigatório verificado antes da transição (com override forçado possível via `ruleOverrideReason`).

## Checklist por etapa

- `PathwayStageChecklistItem` define itens; `requiredForTransition` flag.
- `PatientPathwayChecklistItem` rastreia progresso por paciente.
- Transição bloqueada se itens obrigatórios incompletos (exceto force override).

## SLA

- `PathwayStage.slaHours` define prazo.
- `PatientPathway.enteredStageAt` rastreia entrada.
- Alertas: `sla_warning` e `sla_critical` via notificações.

## Audit trail

- `AuditEvent` para operações sensíveis (transição, upload, etc.).
- `StageTransition` preserva histórico completo com `dispatchStub` (snapshot dos documentos enviados).
