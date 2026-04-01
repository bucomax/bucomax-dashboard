---
name: external-integrations
description: Conecta o painel aos projetos externos WhatsApp (chatbot) e IA (análise de exames). Use quando o usuário pedir webhook, payload de dispatch, callback da IA, contrato entre serviços ou integração com APIs que não são o painel.
---

# Integrações externas (WhatsApp + IA)

## Fronteiras

- **Este repositório não** implementa Meta Cloud API nem modelo de ML; expõe/adapta **HTTP** e persiste estado.
- Todo payload inclui **`tenantId`** para isolamento e auditoria.

## Saída → Chatbot (mudança de etapa)

- Evento típico: `patient.stage_changed` ou nome acordado com o time do canal.
- Corpo mínimo sugerido: `tenantId`, `patientId`, `phone`, `stageId`, `stageTitle`, `messageText`, `documents[]` (`fileId`, `url` ou presign), `correlationId`.
- Falha no HTTP: marcar `ChannelDispatch.status = failed`, permitir retry manual ou job.

## Entrada ← Chatbot

- Webhook `POST /api/v1/webhooks/chatbot`: assinatura/segredo compartilhado; validar origem; atualizar ficha ou status conforme evento (assinatura, resposta).

## IA

- **Disparo:** `POST` serviço de IA com `tenantId`, `clientId`, `stageId`, `type`, inputs (URLs GCS/presign).
- **Callback:** `POST /api/v1/webhooks/ai` com `jobId`, status, `result`; atualizar `AiJob` e dados clínicos na ficha.

## Documentação

- Ao fixar contrato, adicionar ou atualizar `docs/integrations/` (criar pasta quando o código existir).
