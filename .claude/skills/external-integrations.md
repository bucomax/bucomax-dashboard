# Skill: external-integrations

Conecta o painel aos projetos externos WhatsApp (chatbot) e IA (análise de exames).

**Usar quando:** webhook, payload de dispatch, callback da IA, contrato entre serviços, integração com APIs externas.

## Fronteiras

- Este repositório **não** implementa Meta Cloud API nem modelo de ML — expõe/adapta HTTP e persiste estado.
- Todo payload inclui `tenantId` para isolamento e auditoria.

## Saída → Chatbot (mudança de etapa)

- Evento típico: `patient.stage_changed` ou nome acordado com o time do canal.
- Corpo mínimo sugerido:
  ```json
  {
    "tenantId": "...",
    "patientId": "...",
    "phone": "...",
    "stageId": "...",
    "stageTitle": "...",
    "messageText": "...",
    "documents": [{ "fileId": "...", "url": "presigned..." }],
    "correlationId": "..."
  }
  ```
- Falha no HTTP: marcar `ChannelDispatch.status = failed`, permitir retry manual ou job.
- Não logar corpo com PII; logar `correlationId`, status HTTP, duração.

## Entrada ← Chatbot

- Webhook: `POST /api/v1/webhooks/chatbot`.
- Validar assinatura/segredo compartilhado; validar origem.
- Body com schema Zod dedicado.
- Atualizar ficha ou status conforme evento (assinatura, resposta).
- Idempotência por `eventId` quando o parceiro enviar.

## IA — Disparo

- `POST` para serviço de IA com `tenantId`, `clientId`, `stageId`, `type`, inputs (URLs GCS/presign).
- Propagar `idempotencyKey`.
- Tratar resposta `202 Accepted` + `jobId`.
- Persistir `AiJob` com status `pending`.

## IA — Callback

- Webhook: `POST /api/v1/webhooks/ai`.
- Body com `jobId`, `status`, `result`.
- Validar assinatura antes de processar.
- Atualizar `AiJob` e dados clínicos na ficha.
- Responder rápido (200) após enfileirar ou persistir.

## Clientes HTTP

- Timeouts explícitos; retries com backoff exponencial e limite.
- Port `IWhatsAppOutbound` e `IAiJobClient` — use case depende da interface, não do HTTP direto.

## Documentação

- Ao fixar contrato, adicionar ou atualizar `docs/integrations/` (criar pasta quando o código existir).
