# Skill: notifications-system

Sistema de notificações in-app com suporte a fila assíncrona, real-time via SSE, e preferências por tenant.

**Usar quando:** notificações, BullMQ, SSE, notification bell, unread count, notification preferences.

## Arquitetura

- Port: `INotificationEmitter` em `src/application/ports/notification-emitter.port.ts`.
- Implementação: `src/infrastructure/notifications/notification-emitter.ts`.
- Queue: `src/infrastructure/queue/` — BullMQ worker + notification queue.
- Feature frontend: `src/features/notifications/`.
- SSE stream: `GET /api/v1/notifications/stream`.

## Dual-mode

1. **Com Redis (Queue Mode):**
   - Notificação enfileirada no BullMQ.
   - Worker processa e persiste no Prisma.
   - SSE pub/sub para entrega real-time.
   - Rate limit e distributed locks ativos.

2. **Sem Redis (Inline Mode):**
   - Notificação escrita diretamente no Prisma.
   - SSE retorna 501; frontend faz polling.
   - Rate limit fail-open; locks sempre concedidos.

## Tipos de notificação

| Tipo | Trigger |
|------|---------|
| `sla_critical` | Paciente ultrapassou SLA da etapa |
| `sla_warning` | Paciente próximo do limite SLA |
| `stage_transition` | Paciente mudou de etapa |
| `new_patient` | Novo paciente cadastrado |
| `checklist_complete` | Checklist da etapa completado |

## Emissão

```typescript
await notificationEmitter.emit({
  tenantId,
  type: 'stage_transition',
  title: '...',
  body: '...',
  metadata: { clientId, patientPathwayId, stageId },
  correlationId, // deduplicação
  clientId,      // para filtro de visibilidade
});
```

## Filtros

- Notificações filtradas por `TenantMembership` — `tenant_user` com escopo restrito vê apenas notificações de clientes atribuídos.
- Preferências do tenant: flags no `Tenant` model controlam quais tipos de notificação estão ativos.

## APIs

- `GET /api/v1/notifications` — listar notificações do usuário.
- `GET /api/v1/notifications/unread-count` — contagem de não lidas.
- `PATCH /api/v1/notifications/[id]/read` — marcar como lida.
- `POST /api/v1/notifications/read-all` — marcar todas como lidas.
- `GET /api/v1/notifications/stream` — SSE real-time.
- `GET /api/v1/tenant/notifications` — preferências de notificação do tenant (admin).
