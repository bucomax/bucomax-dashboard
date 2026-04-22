# Regra: infrastructure

Aplica-se a arquivos em `src/infrastructure/**/*.ts` e `packages/**/*.prisma`.

## Prisma

- Schema em `packages/prisma/schema.prisma`.
- Migrations versionadas; **nunca** `db push` em produção sem processo.
- Singleton: `src/infrastructure/database/prisma.ts` — usar `import { prisma } from "@/infrastructure/database/prisma"`.
- Índices compostos: `(tenantId, …)`, `(pathwayVersionId, order)` único em etapas.
- Soft delete só se produto exigir; caso contrário constraints claras + auditoria.

## GCS (object storage)

- Chaves: `tenants/{tenantId}/clients/{clientId}/...` — nunca bucket público.
- Presign v4: expiração curta; gerar em lote no bundle da transição.
- Metadados sempre na tabela `FileAsset` (mime, size, `tenantId`); `r2Key` guarda a chave.
- Implementação: `src/infrastructure/storage/gcs-storage.ts`.

## Clientes HTTP externos

- Timeouts explícitos; retries com backoff e limite.
- WhatsApp: não logar corpo com PII; logar `correlationId`, status HTTP, duração.
- IA: propagar `tenantId`, `idempotencyKey`; tratar `202` + `jobId`.

## Notificações

- Port: `INotificationEmitter` em `src/application/ports/notification-emitter.port.ts`.
- Impl: `src/infrastructure/notifications/notification-emitter.ts`.
- Dual-mode: BullMQ queue (com Redis) ou inline Prisma (fallback).
- Tipos: `sla_critical`, `sla_warning`, `stage_transition`, `new_patient`, `checklist_complete`.
- Deduplicação via `correlationId`.

## Queue / BullMQ

- Infra: `src/infrastructure/queue/`.
- Worker inicializado via `instrumentation.ts`.
- Circuit breaker para falhas de Redis.
- SSE pub/sub para notificações real-time.

## Webhooks de entrada

- `/webhooks/ai` e `/webhooks/chatbot`: validar assinatura ou secret antes de processar.
- Responder rápido (200) após enfileirar ou persistir; processamento pesado em job.

## Rate limiting e locks

- Rate limit: `src/lib/api/rate-limit.ts` — Redis INCR/EXPIRE; 3 presets (auth, api, sse).
- Distributed lock: `src/lib/api/distributed-lock.ts` — Redis SET NX EX; fail-open sem Redis.
