---
name: stage-transition
description: Implementa ou revisa a mudança de etapa do paciente na jornada clínica, disparo ao WhatsApp com pacote completo de documentos e auditoria. Use quando o usuário pedir transição de etapa, PatientPathway, StageTransition, ChannelDispatch, bundle de PDFs ou envio ao chatbot ao mover paciente.
---

# Transição de etapa (jornada do paciente)

## Ordem obrigatória do fluxo

1. Autenticar e resolver **`tenantId`** (token + membership ou super admin).
2. Carregar **`PatientPathway`** do `clientId` e validar que `toStageId` pertence ao mesmo `pathwayVersionId`.
3. Persistir **`StageTransition`** (`fromStageId`, `toStageId`, `actorUserId`, `correlationId` novo UUID).
4. Atualizar **`PatientPathway.currentStageId`**.
5. **`BuildStageDocumentBundle`:** `StageDocument` ⋈ `File` para `toStageId`, `ORDER BY sortOrder` — enviar **todos** os documentos da etapa (regra de produto).
6. Gerar URLs assinadas (R2) para cada arquivo do bundle.
7. **`DispatchWhatsApp`:** POST para API do projeto chatbot com payload acordado; persistir **`ChannelDispatch`** (`payloadSnapshot`, `status`, erro se houver).
8. Opcional: enfileirar **`AiJob`** se a etapa tiver flag de IA.

## Idempotência

- Usar `correlationId` na transição; não duplicar `ChannelDispatch` para o mesmo `transitionId` em retry de sucesso.
- Reenvio por **nova** transição (ex.: médico move de volta à mesma etapa) é decisão de negócio — documentar se gera novo dispatch.

## Referência

- `docs/ARCHITECTURE.md` §8 e `docs/PRODUCT-SCOPE.md` §3.1.
