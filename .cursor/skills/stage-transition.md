# Skill: stage-transition

Implementa ou revisa a mudança de etapa do paciente na jornada clínica, disparo ao WhatsApp com pacote completo de documentos e auditoria.

**Usar quando:** transição de etapa, PatientPathway, StageTransition, ChannelDispatch, bundle de PDFs, envio ao chatbot ao mover paciente.

## Ordem obrigatória do fluxo

1. **Autenticar** e resolver `tenantId` (token + membership ou super admin).
2. **Carregar `PatientPathway`** do `clientId` e validar que `toStageId` pertence ao mesmo `pathwayVersionId`.
3. **Verificar checklist** — itens com `requiredForTransition = true` devem estar completos. Se incompletos, bloquear transição (exceto `forceOverride` com `ruleOverrideReason` e `forcedByUserId`).
4. **Lock distribuído** — `tryAcquire(lockKey)` para evitar transição concorrente no mesmo `patientPathwayId`.
5. **Persistir `StageTransition`** — `fromStageId`, `toStageId`, `actorUserId`, `correlationId` (novo UUID), `dispatchStub` (snapshot dos documentos).
6. **Atualizar `PatientPathway`** — `currentStageId = toStageId`, `enteredStageAt = now`.
7. **Resolver assignee** — `defaultAssigneeUserIds` da stage ou manter assignee anterior.
8. **`BuildStageDocumentBundle`** — `StageDocument` ⋈ `FileAsset` para `toStageId`, `ORDER BY sortOrder` — enviar **todos** os documentos da etapa (regra de produto).
9. **Gerar URLs assinadas** (GCS v4) para cada arquivo do bundle.
10. **`DispatchWhatsApp`** — POST para API do chatbot com payload acordado; persistir `ChannelDispatch` (`payloadSnapshot`, `status`, erro se houver).
11. **Emitir notificação** — `stage_transition` via `INotificationEmitter`.
12. **Registrar `AuditEvent`** — tipo `stage_transition` com metadata mínima (sem PII).
13. **Revalidar cache** — `revalidateTenantClientsList()` para atualizar ISR.
14. Opcional: enfileirar `AiJob` se a etapa tiver flag de IA.

## Idempotência

- `correlationId` na transição; não duplicar `ChannelDispatch` para o mesmo `transitionId` em retry de sucesso.
- Reenvio por **nova** transição (ex.: médico move de volta à mesma etapa) é decisão de negócio — documentar se gera novo dispatch.

## Transação

- Passos 5-7 dentro de `prisma.$transaction()` — atômico.
- Dispatch externo (passo 10) **após** commit — se falhar, `ChannelDispatch.status = failed`, permitir retry manual.

## Concorrência

- Lock: `transition:${patientPathwayId}` — TTL curto (ex. 10s).
- Se lock não adquirido: retornar 409 CONFLICT.
- Sem Redis: lock fail-open (aceitar risco controlado).

## Arquivos de referência

- Route handler: `src/app/api/v1/patient-pathways/[patientPathwayId]/transition/route.ts`
- Guards: `src/lib/auth/guards.ts`
- Lock: `src/lib/api/distributed-lock.ts`
- Notificações: `src/application/ports/notification-emitter.port.ts`
- Audit: `recordAuditEvent()` pattern nas rotas existentes
- Docs: `docs/ARCHITECTURE.md` §8, `docs/PRODUCT-SCOPE.md` §3.1
