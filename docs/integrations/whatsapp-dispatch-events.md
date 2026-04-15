# WhatsApp Business (Cloud API): eventos que disparam envio e confirmação do paciente

Este documento descreve **quando** o painel enfileira envio ao WhatsApp, **o que** é enviado e **como** a confirmação do paciente (botões) e os **status de entrega/leitura** da Meta alimentam `ChannelDispatch` e `AuditEvent`.

Implementação de referência: `enqueueWhatsAppDispatch` → fila BullMQ ou inline → `whatsappDispatcher.dispatch` (`src/infrastructure/whatsapp/`).

---

## Pré-condições (todas devem ser verdadeiras)

| Condição | Comportamento se falhar |
|----------|-------------------------|
| Tenant com **WhatsApp habilitado** nas configurações (`whatsappEnabled`) | Nada é enviado; transição/início de jornada segue normalmente. |
| **Telefone** do `Client` preenchido (`phone`) | O enqueue **não** é chamado nas rotas atuais (sem documento via WhatsApp nesse caso). |
| **Pacote de documentos da etapa** não vazio | Sem PDFs/anexos vinculados à etapa de destino, não há o que enviar; enqueue não roda. |

Credenciais Meta (Phone Number ID, token criptografado, etc.) são validadas dentro do dispatcher; se faltarem, o envio falha ou é ignorado conforme o fluxo já implementado.

---

## Eventos de negócio que disparam a fila de WhatsApp

O envio **não** é um job cron: dispara **logo após** persistir uma `StageTransition` válida, nas rotas abaixo.

### 1. Início da jornada do paciente

- **HTTP:** `POST /api/v1/patient-pathways`
- **Momento:** após criar `PatientPathway` e a **primeira** `StageTransition` (entrada na primeira etapa publicada).
- **Regra:** se existir ao menos um documento em `StageDocument` para essa etapa **e** o cliente tiver `phone`, chama-se `enqueueWhatsAppDispatch` com o `stageTransitionId` recém-criado, nome da etapa e lista de arquivos (nome, `r2Key`, mime).

### 2. Mudança de etapa (transição)

- **HTTP:** `POST /api/v1/patient-pathways/{patientPathwayId}/transition`
- **Momento:** após transação que cria `StageTransition`, atualiza etapa atual do paciente e registra auditoria de transição.
- **Regra:** se o **pacote da etapa de destino** tiver documentos **e** o cliente tiver `phone`, chama-se `enqueueWhatsAppDispatch` com o `stageTransitionId` da transição criada.

Em ambos os casos o processamento é **assíncrono** (fire-and-forget): erro no enqueue ou no worker não reverte a transição já gravada.

---

## O que é enviado ao paciente (por disparo)

Para cada disparo enfileirado com documentos:

1. **Um documento por arquivo** do pacote da etapa: mensagem tipo **document** na API Cloud, com link **presign** (GCS, TTL ~30 min) e legenda curta.
2. **Uma mensagem interativa** com **botões de resposta** (reply), após os documentos, pedindo confirmação de recebimento.

Texto atual do corpo da mensagem interativa (pode evoluir no código):

> Você recebeu N documento(s) da etapa "**{nome da etapa}**". Por favor, confirme o recebimento.

---

## Botões de confirmação (reply)

Os botões são definidos na chamada `sendInteractiveButtonMessage` (Graph API v21). Hoje:

| `id` (payload técnico) | Texto exibido ao paciente | Uso pretendido |
|------------------------|---------------------------|----------------|
| `received` | Recebi os documentos | Confirmação explícita de recebimento. |
| `help` | Preciso de ajuda | Canal para pedir suporte (produto pode evoluir notificações internas). |

### Comportamento atual no backend

- O webhook `POST /api/v1/webhooks/whatsapp` recebe mensagens `interactive` com `button_reply` e usa `context.id` (ID da mensagem interativa na Meta) para localizar o `ChannelDispatch` da mensagem de confirmação.
- Ao processar qualquer um dos dois botões, o fluxo `handleButtonReply`:
  - marca o dispatch da mensagem interativa (e demais dispatches da mesma transição que não falharam) como **`CONFIRMED`**, preenche `confirmedAt` e `confirmationPayload` (valor = **`id` do botão**: `received` ou `help`);
  - grava **`AuditEvent`** `WHATSAPP_PATIENT_CONFIRMED` com `channelDispatchId`, `stageTransitionId` e `buttonPayload`.

**Observação de produto:** hoje **ambos** os botões disparam o mesmo fluxo de “confirmado” na base; a distinção fica em `confirmationPayload` (`received` vs `help`). Se no futuro “Preciso de ajuda” não deve contar como confirmação de leitura, será preciso ramificar em `handleButtonReply`.

---

## Leitura vs “confirmado” na auditoria

Conceitos diferentes:

| Fonte | O que significa | Onde aparece |
|-------|-----------------|--------------|
| **Webhooks de status** da Meta (`sent`, `delivered`, `read`, `failed`) | Eventos de entrega da mensagem na rede WhatsApp. | Atualiza `ChannelDispatch` (timestamps e status) e gera `AuditEvent` `WHATSAPP_DISPATCH_SENT`, `WHATSAPP_DISPATCH_DELIVERED`, `WHATSAPP_DISPATCH_READ`, `WHATSAPP_DISPATCH_FAILED` conforme o caso. |
| **Clique em botão** (`received` / `help`) | Ação explícita do paciente na mensagem interativa. | `ChannelDispatch.status = CONFIRMED`, `confirmationPayload`, e `WHATSAPP_PATIENT_CONFIRMED` na auditoria. |

Ou seja: **“lido”** no sentido Meta (`read`) vem dos **status**; **“confirmou recebimento”** no sentido clínico/auditoria do produto está atrelado ao **botão** (e ao payload `received` vs `help` se vocês filtrarem relatórios).

---

## Variáveis de ambiente (servidor)

| Variável | Função |
|----------|--------|
| `WHATSAPP_ENCRYPTION_KEY` | Criptografia do access token do tenant. |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Verificação GET do webhook na Meta. |
| `WHATSAPP_APP_SECRET` | Validação `X-Hub-Signature-256` no POST. |

URL de callback única: `/api/v1/webhooks/whatsapp` (tenant resolvido por `phone_number_id` no payload).

---

## Referências no repositório

- Rotas API: `src/app/api/v1/patient-pathways/route.ts`, `.../transition/route.ts`, `src/app/api/v1/webhooks/whatsapp/route.ts`
- Dispatcher e cliente Graph: `src/infrastructure/whatsapp/whatsapp-dispatcher.ts`, `whatsapp-cloud-client.ts`
- Modelo: `ChannelDispatch`, enums `DispatchChannel` / `DispatchStatus` — ver [ARCHITECTURE.md](../ARCHITECTURE.md) (modelo de dados).
