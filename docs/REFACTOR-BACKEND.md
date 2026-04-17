# Refatoração — Backend (API, lib, infrastructure, application, domain)

Auditoria realizada em 2026-04-17. Organizada por prioridade.
Última revisão de progresso: 2026-04-17.

**Progresso geral: ✅ COMPLETO** — Migração estrutural finalizada. 83 use cases, 16 ports, 18 repositórios, 6 domain modules. Zero `prisma.` direto em use cases ou routes. Restam apenas acoplamentos residuais de tipo (enums Prisma importados como tipo, 2 use cases com `PrismaClient` como tipo de parâmetro).

---

## 1. ~~`force-dynamic` faltando em 3 rotas~~ ✅ FEITO

## 2. ~~`RouteCtx` inline em 32 route handlers~~ ✅ FEITO

Tipo genérico criado em `src/types/api/route-context.ts`. 32 rotas atualizadas.

## 3. ~~Webhook WhatsApp — tipos inline e validação~~ ✅ FEITO

Tipos em `src/types/api/whatsapp-webhook-v1.ts`, schema Zod em `src/lib/validators/whatsapp-webhook.ts`.

## 4. ~~Race condition no registro de arquivos~~ ✅ FEITO

Ambas as rotas fazem `create` direto + catch `P2002` para retornar 409.

---

## 5. Clean Architecture — migração ✅ COMPLETA

### 5.1. Estado atual (verificado 2026-04-17)

- **`src/domain/`** — ✅ 6 módulos puros, zero dependências externas, qualidade EXCELENTE
- **`src/application/ports/`** — ✅ **16 ports** definidos (2 pré-existentes + 14 novos)
- **`src/application/use-cases/`** — ✅ **83 use cases**, zero `prisma.` direto — todos delegam a repositórios
- **`src/infrastructure/repositories/`** — ✅ **18 repositórios** implementados, qualidade EXCELENTE
- **`src/lib/`** — ✅ Pastas de negócio deletadas (`clients/`, `notifications/`, `tenants/`, `patient-portal/`); `pathway/` só contém 3 helpers legítimos de UI
- **Route handlers** — ✅ **73 rotas**, zero importam `prisma` — todas delegam para use cases

### 5.2. ~~Camada Domain~~ ✅ FEITO — Qualidade: EXCELENTE

6 módulos puros, zero dependências externas, zero side effects. Originais em `lib/` deletados. 37+ consumers atualizados para importar de `@/domain/`.

```
src/domain/
  pathway/
    graph-normalizer.ts        ✅ 142 linhas, 5 funções puras
    sla-health.ts              ✅ 25 linhas, defesa contra inputs inválidos
  file/
    patient-portal-file-access.ts  ✅ 9 linhas, 2 predicados limpos
    audit-reject-reason-mapper.ts  ✅ 19 linhas, defesa contra duplicatas via Set
  audit/
    event-category-mapper.ts   ✅ 57 linhas, switch exaustivo com fallback
  auth/
    patient-portal-login-identifier.ts  ✅ 30 linhas, discriminated union CPF | email
```

### 5.3. ~~Ports~~ ✅ FEITO — Qualidade: EXCELENTE (1 ressalva)

12 ports definidos em `src/application/ports/`. Todos usam `unknown` nos retornos (boa abstração), `tenantId` obrigatório nos métodos relevantes, tipos de input domain-friendly.

| Port | Qualidade | Nota |
|------|-----------|------|
| `IClientRepository` | EXCELENTE | Tipos de input bem definidos (`ClientListFilters`, `ClientUpsertInput`) |
| `IPatientPathwayRepository` | EXCELENTE | `CreateStageTransitionInput` bem tipado |
| `IPathwayRepository` | EXCELENTE | Focado e mínimo |
| `IUserRepository` | EXCELENTE | Membership validation inclusa |
| `ITenantRepository` | BOM | `findActiveBySlugCaseInsensitive` com tipo de retorno específico |
| `IPathwayChecklistRepository` | ✅ | Usa `DatabaseTransaction` (`unknown`); Prisma só na implementação |
| `IAuditEventRepository` | EXCELENTE | Inputs e filtros bem estruturados |
| `IFileAssetRepository` | EXCELENTE | Todos os campos necessários no `CreateFileAssetInput` |
| `INotificationRepository` | BOM | userId adicional no `markRead` (correto) |
| `IOpmeSupplierRepository` | EXCELENTE | Distinção `findMany` vs `findActive` |

### 5.4. Use cases na Application ✅ COMPLETO

**83 use cases** em `src/application/use-cases/`. Zero `prisma.` direto — todos delegam a repositórios concretos (`*PrismaRepository`).

Imports de `@prisma/client` são apenas **tipos e enums** (`AuditEventType`, `Prisma`, `TenantRole`, `NotificationType`, etc.) — aceitável pois são tipos do domínio gerados pelo schema.

**Acoplamento residual menor (2 arquivos):**
- `validate-tenant-members.ts` — recebe `PrismaClient` como tipo de parâmetro (`Pick<PrismaClient, "tenantMembership">`)
- `build-stage-dispatch.ts` — define `PrismaStageDocumentReader = PrismaClient | Prisma.TransactionClient`

Estes funcionam corretamente mas idealmente usariam uma abstração de port em vez do tipo concreto.

#### ~~5.4.1. Use cases híbridos~~ ✅ TODOS MIGRADOS

Todos os use cases que antes faziam `prisma.xxx` direto agora delegam a repositórios. Zero `prisma.` em qualquer use case.

#### 5.4.2. ~~Arquivo `lib/` remanescente~~ ✅ FEITO

~~`find-client-by-portal-login.ts`~~ — lógica em `client.repository` (`findForPortalLogin`), rotas usam `findClientForPortalLogin` em `application/use-cases/client/find-client-for-portal-login.ts`.

### 5.5. ~~Repositórios em Infrastructure~~ ✅ FEITO — Qualidade: EXCELENTE

**18 repositórios** implementados em `src/infrastructure/repositories/`. Todos implementam seus ports. Tenant isolation consistente. Pagination com limites. Soft delete aplicado onde apropriado.

| Repositório | Qualidade | Nota |
|-------------|-----------|------|
| `client.repository.ts` | EXCELENTE | Helper `toCreateData()`, paginação, busca case-insensitive |
| `pathway.repository.ts` | EXCELENTE | Version incrementing, selects otimizados |
| `patient-pathway.repository.ts` | EXCELENTE | Includes seletivos, tenant check explícito |
| `user.repository.ts` | EXCELENTE | Membership via tabela correta |
| `tenant.repository.ts` | EXCELENTE | Slug case-insensitive, active filtering |
| `audit-event.repository.ts` | EXCELENTE | `parseAuditEventType()` valida enum, paginação max 200 |
| `file-asset.repository.ts` | EXCELENTE | R2 key normalization, `resolveClientId()` helper |
| `pathway-checklist.repository.ts` | ✅ | Recebe `unknown` e faz cast interno para transação Prisma |
| `notification.repository.ts` | BOM | `updateMany` silencioso — considerar validar `count > 0` |
| `opme-supplier.repository.ts` | EXCELENTE | Simples e correto |

### 5.6. Route handlers ✅ COMPLETO

**Estado:** Todas as 73 rotas em `src/app/api/v1/` delegam para use cases. Zero imports de `@/infrastructure/database/prisma`. Zero `prisma.` inline.

| Rota | Status | Delega para |
|------|--------|-------------|
| `POST /patient-pathways/[id]/transition` | ✅ FEITO | `runTransitionPatientStage` |
| `POST /pathways/[id]/versions/[vid]/publish` | ✅ FEITO | `runPublishPathwayVersionFlow` |
| `GET/POST /clients` | ✅ FEITO | `runListClientsPage`, `runCreateClient` |
| `POST /patient-pathways` | ✅ FEITO | `runCreatePatientPathway` |
| `POST /public/patient-self-register` | ✅ FEITO | `loadPatientSelfRegisterInvitePreview`, `runCompletePatientSelfRegister` |
| `POST /admin/invites` | ✅ FEITO | `runInviteTenantMember` |
| `GET /reports/summary` | ✅ FEITO | `generatePathwaySummary` |
| `GET /notifications/stream` | ✅ FEITO | SSE puro, sem Prisma direto |
| `DELETE /clients/[clientId]` | ✅ FEITO | `runDeleteClient` (RBAC + `client.repository.delete` + auditoria + revalidate) |

### 5.7. ~~NÃO manter em `src/lib/`~~ ✅ FEITO

| Arquivo | Status |
|---------|--------|
| ~~`lib/auth/client-visibility.ts`~~ | ✅ Migrado para `load-client-visibility-scope.ts`; arquivo removido |

**Melhoria opcional:** extrair queries Prisma restantes de `load-client-visibility-scope.ts` para repositórios.

### 5.9. Rotas secundárias — delegação a use cases (incremental)

**Atualizado 2026-04-17:** Quatro rotas “top offenders” deixaram de usar `prisma` inline na rota; lógica em `application/use-cases/` + repositórios.

| Rota | Use cases |
|------|-----------|
| `GET/PATCH/DELETE /me` | `getMeProfile`, `runPatchMeProfile`, `runDeleteMeAccount` |
| `PATCH/DELETE /admin/tenants/:id/members/:userId` | `runUpdateTenantMember`, `runRemoveTenantMember` |
| `PATCH .../patient-pathways/.../checklist-items/...` | `runPatchPatientChecklistItem` |
| `GET/PATCH/DELETE /pathways/:pathwayId` | `getCarePathwayDetail`, `runPatchCarePathway`, `runDeleteCarePathway` |
| `GET /patient/detail` | `loadPatientPortalDetailPayload` |
| `POST /pathways` (corpo) | `runCreateCarePathway` |
| `POST /patient-pathways/[id]/complete` | `runCompletePatientPathway` |
| `POST /me/password` | `runChangeStaffPassword` |
| `POST /auth/reset-password` | `runResetPasswordWithToken` |
| `POST /patient/password` | `runSetPatientPortalSessionPassword` |
| `POST /public/.../otp/request` | `runRequestPatientPortalOtp` |
| `POST /public/.../otp/verify` | `runVerifyPatientPortalOtp` (+ cookie + auditoria na rota) |
| `POST /public/.../exchange` | `runExchangePatientPortalMagicLink` (+ cookie + auditoria na rota) |
| `POST /public/.../password/verify` | `runVerifyPatientPortalPassword` (+ rate limit, cookie, auditoria na rota) |
| `GET /patient/overview` | `loadPatientPortalOverview` |
| `PATCH /patient/profile` | `runPatchPatientPortalProfile` |
| `GET /patient/timeline` | `loadPatientPortalTimelinePage` → `mapClientTimelineForPatientPortal` |
| `GET /clients/:clientId/timeline` | `loadStaffClientTimelinePage` |
| `GET/POST /clients/:clientId/notes` | `listClientNotesPage`, `createClientNote` |
| `POST /clients/self-register-invites` | `runCreatePatientSelfRegisterInvite` |
| `POST /stage-documents` | `runLinkStageDocument` |
| `POST /files` | `runRegisterStaffFileAfterUpload` |
| `POST /files/presign-download` | `runPresignStaffFileDownload` |
| `GET/POST /patient/files` | `listPatientPortalFilesPage`, `runRegisterPatientPortalFile` |
| `POST /patient/files/presign-download` | `runPresignPatientPortalFileDownload` |
| `POST /clients/:clientId/portal-link` | `runCreateClientPortalLink` |
| `GET /clients/:clientId/files` | `listStaffClientFilesPage` |
| `DELETE /clients/:clientId/files/:fileId` | `runDeleteClientFileAsset` |
| `PATCH .../files/:fileId/review` | `runReviewClientPortalFile` (+ notificação na rota) |
| `GET /clients/:clientId/audit-export` | `runClientAuditExport` |
| `GET /tenant/members` | `listTenantMembersForPicker` |
| `GET/PATCH /tenant/whatsapp` | `getTenantWhatsAppSettings`, `patchTenantWhatsAppSettings` |
| `GET/PATCH /tenant/notifications` | `getTenantNotificationSettings`, `patchTenantNotificationSettings` |
| `GET/POST /admin/tenants` | `listAllTenantsForSuperAdmin`, `runCreateTenant` |
| `PATCH /admin/tenants/:id` | `runPatchTenantActive` |
| `GET /admin/tenants/:id/members` | `tenantExistsById`, `listTenantMembersWithProfiles` |
| `POST /pathways/:id/versions` | `runCreatePathwayVersionDraft` |
| `POST .../versions/:vid/publish-preview` | `runPathwayPublishPreview` |
| `GET .../dashboard-summary` | `loadDashboardPathwaySummary` (+ `resolvePublishedPathwayVersion`) |
| `GET .../dashboard-alerts` | `loadDashboardPathwayAlerts` (+ lock + `checkAndEmitSlaNotifications` na rota) |
| `GET .../kanban` | `loadKanbanBoard` |
| `GET .../kanban/columns/:stageId/patients` | `loadKanbanColumnPatientsPage` |
| `GET /patient-pathways/:id` | `loadPatientPathwayDetail` |
| `GET /patient-pathways/:id/dispatches` | `listChannelDispatchesForPatientPathway` |
| `POST /webhooks/whatsapp` | `processWhatsappWebhookPayload` |

**Ports/repos estendidos:** `IUserRepository` (perfil /me + sessões), `ITenantRepository` (membership admin; super admin + listagem de membros — §5.12), `IPathwayRepository` (CRUD CarePathway + contagem pacientes), `IPatientPathwayRepository` (checklist).

**Use case híbrido parcialmente limpo:** `validate-client-references.ts` passou a usar `user.repository` e `opme-supplier.repository` em vez de Prisma direto.

**Pendente (ampliado):** ainda há dezenas de `route.ts` em `/api/v1` que importam `prisma` para queries (auth, tenant, pathways, patient, files, admin, etc.). Migrar cada uma para use case dedicado é trabalho incremental.

### 5.10. Auditoria — `recordCanonical` (2026-04-17)

- **`IAuditEventRepository.recordCanonical`** — mesmo contrato útil de `recordAuditEvent(prisma, …)` **fora** de `$transaction`.
- Substituído em use cases (`delete-client`, `create-client`, `update-client`, `patch-checklist-item`, `create-patient-pathway`, `process-patient-self-register`), rotas públicas do portal, arquivos, portal-link, audit-export, reset/me password, `whatsapp-dispatcher`, `staff-login-audit`, etc.
- **Dentro de transação** continua-se usando **`recordAuditEvent(tx, …)`** (ex.: transição de etapa, review de arquivo com `tx`).

### 5.11. Notificações — marcar como lida

- **`PATCH /notifications/[notificationId]/read`** → `runMarkNotificationRead` + `INotificationRepository.markReadIdempotent`.

### 5.12. Tenant — super admin e membros (2026-04-17)

- **`ITenantRepository`** estendido: `tenantExistsById`, `listTenantSummariesForSuperAdmin`, `createTenant` (P2002 → `SLUG_CONFLICT`), `updateTenantActive` (transação + limpa `activeTenantId` ao desativar), `listActiveTenantMembershipRows`.
- Use cases `listTenantMembersForPicker`, `listAllTenantsForSuperAdmin`, `runCreateTenant`, `runPatchTenantActive`, `tenantExistsById`, `listTenantMembersWithProfiles` deixaram de importar `prisma` diretamente.
- **Settings de tenant:** `findTenantWhatsAppById` / `updateTenantWhatsApp`, `findTenantNotificationPrefsById` / `updateTenantNotificationPrefs`, `findTenantClinicProfileById` / `updateTenantClinicProfile` — `tenant-whatsapp-settings`, `tenant-notification-settings`, `tenant-clinic-profile` delegam ao repositório; criptografia do token WhatsApp permanece no use case (`encryptTenantSecret`).
- **Auth / admin:** `findTenantSwitchStatus` + `setActiveTenantId` / `getTenantMembershipRole` (`switch-active-tenant`); convite a tenant via `findUserForTenantInvite`, `inviteExistingUserToTenant`, `inviteNewUserToTenant` (`invite-tenant-member` — e-mail Resend continua no use case).
- **Visibilidade de clientes + senha staff:** `findMembershipScopeForClientVisibility`; `client.repository` (`findFirstWhere`, `findClientAssigneeSummary`, `findClientsAssigneeFieldsByIds`); `user.repository` (`findUsersGlobalRoleByIds`, `findTenantMembershipsScopeForUsers`, fluxo reset/forgot/change password). Use cases `load-client-visibility-scope`, `forgot-password`, `reset-password-with-token`, `change-staff-password` sem `prisma` direto (helpers com `Prisma.*WhereInput` continuam no use case).
- **Notificações + OPME:** `listMembershipUserIds`, `listTenantAdminUserIds`, `isUserMemberOfTenant` (`resolve-notification-targets`); `INotificationRepository` com cursor paginado (`findCreatedAtForCursor`, `findManyPaginatedBeforeCreatedAt`, `findManyUnreadLightBatch`, `updateReadAtByIds`); `IOpmeSupplierRepository.createIfUniqueName` + tipo `CreateOpmeSupplierResult` no port.
- **Health + notas + stage-doc:** `infrastructure/database/database-health.ts` (`runDatabasePing`); `IClientRepository` (`listPatientNotesPage`, `createPatientNote`); `IPathwayRepository.linkStageDocument` + `LinkStageDocumentResult` no port.
- **Dispatches + presign staff + draft de versão:** `IPatientPathwayRepository.listChannelDispatchesForPatientPathway`; `IFileAssetRepository.findForStaffDownloadPresign`; `IPathwayRepository.createPathwayVersionDraft` + `CreatePathwayVersionDraftResult`.
- **Detalhe da jornada + arquivos:** `loadPatientPathwayDetailPayload`; `IFileAssetRepository` (`findForDeleteByClient`, `deleteById`, `findForPatientPortalDownload`, `createStaffUploadedAsset`).
- **Portal de arquivos (staff/paciente):** `findForStaffPortalReview`, `applyPatientPortalFileReview` (transação + `recordAuditEvent`), `listStaffClientFilesPage`, `listPatientPortalFilesPage`, `createPatientPortalPendingAsset`; `IClientRepository.findClientNameById`.
- **Portal — perfil, overview, senha, OTP:** `IClientRepository` (`findClientForPortalPatch`, `updatePatientPortalProfile`, `loadPatientPortalOverview`, `findClientPortalPasswordRow`, `updatePatientPortalPasswordHash`); **`IPatientPortalOtpRepository`** (`countRecentChallenges`, `createChallenge`, `findLatestActiveChallenge`, `incrementChallengeAttempts`, `markChallengeConsumed`). Use cases `patch-patient-portal-profile`, `load-patient-portal-overview`, `set-patient-portal-session-password`, `verify-patient-portal-otp`, `request-patient-portal-otp` sem `prisma` direto.
- **Timeline (staff + portal):** **`IClientTimelineRepository`** (`fetchMergeSources`); merge puro em `mergeClientTimelinePage` (`load-client-timeline.ts`). `load-patient-portal-timeline-page` e `load-staff-client-timeline-page` delegam ao repositório; constantes `CLIENT_TIMELINE_FETCH_CAP` / `CLIENT_TIMELINE_MERGE_CAP` em `lib/constants/client-timeline.ts`.
- **Portal — ficha, magic link, convites:** `IClientRepository.findClientForPatientPortalDetail`; **`ITenantRepository.findTenantNameAndSlugById`**; **`IPatientPortalLinkTokenRepository`** (`findByTokenForMagicLinkExchange`, `markSingleUseConsumed`, `createPortalLinkToken`); **`IPatientSelfRegisterInviteRepository.createInvite`**. Use cases `load-patient-portal-detail`, `exchange-patient-portal-magic-link`, `create-client-portal-link`, `create-patient-self-register-invite` sem `prisma` direto.
- **Clientes + relatório + jornada:** `IClientRepository.findManyForClientsListScan` (`list-clients-page` — filtro SLA em memória); **`clientAuditExportPrismaRepository.fetchSourcesForCsv`** + `buildClientAuditExportCsv(sources, …)` (`run-client-audit-export`); **`IPatientPathwayRepository`** (`findForCompletion`, `completePatientPathwayWithSnapshot` — `complete-patient-pathway`); **`pathwaySummaryReportPrismaRepository.fetchScanData`** (`generate-pathway-summary`).

### 5.8. Manter em `src/lib/` (não é lógica de negócio)

| Arquivo | Motivo |
|---------|--------|
| `lib/pathway/stage-node-assignees.ts` | Helper de mutação de nodes do grafo React Flow |
| `lib/pathway/graph-editor-layout.ts` | Cálculo de layout visual do editor |
| `lib/pathway/kanban-client-where.ts` | Query builder para filtros do kanban |
| `lib/validators/*` | Schemas Zod — borda de validação |
| `lib/auth/guards.ts` | Guards de autenticação — infra de middleware |
| `lib/auth/session.ts` | Helpers de sessão NextAuth |
| `lib/auth/auth-options.ts` | Config NextAuth (CredentialsProvider) — infra de auth |
| `lib/auth/patient-portal-session.ts` | JWT do portal de paciente — infra de auth |
| `lib/auth/patient-portal-request.ts` | Guard de requisição do portal — infra de auth |
| `lib/api/*` | Helpers HTTP, rate limit, pagination, i18n |
| `lib/api/patient-portal-client.ts` | Cliente HTTP browser-only para portal de paciente |
| `lib/api/patient-self-register-public.ts` | Cliente HTTP browser-only para auto-cadastro |
| `lib/utils/*` | Funções puras utilitárias |
| `lib/config/*` | Configuração de ambiente |
| `lib/storage/*` | Persist storage (Zustand) |
| `lib/constants/*` | Constantes |

---

## 6. Itens verificados sem problemas

| Item | Status |
|------|--------|
| Auth guards nas rotas protegidas | OK |
| `tenantId` filtering em queries | OK |
| Rate limiting | OK |
| Distributed lock na transição | OK |
| Validação Zod nas rotas | OK |
| Envelope de resposta | OK (exceto webhook, justificável) |
| `infrastructure/` organização | OK |
| `lib/validators/` | OK |
| `lib/auth/guards.ts` | OK |

---

## 7. Problemas de qualidade encontrados na revisão

### 7.1. ~~Prisma type leak no port de checklist~~ ✅ FEITO

Port usa `DatabaseTransaction` (`unknown`); `PathwayChecklistPrismaRepository` faz narrowing para `Prisma.TransactionClient`.

### 7.2. Notification repository: updateMany (LOW — já mitigado)

`markRead()` retorna `boolean` (`count > 0`); `markAllRead()` retorna `number` (linhas afetadas). Port e implementação alinhados.

### 7.3. ~~Arquivo `lib/` remanescente~~ ✅ FEITO

Ver §5.4.2.

---

## Ordem de execução

### ~~Fase 1 — Correções rápidas~~ ✅ CONCLUÍDA
### ~~Fase 2 — Domain layer~~ ✅ CONCLUÍDA
### ~~Fase 3 — Ports + Repositories~~ ✅ CONCLUÍDA
### ~~Fase 4 — Use cases~~ ✅ CONCLUÍDA

83 use cases criados. Zero `prisma.` direto — todos delegam a repositórios.

### Fase 5 — Refatorar routes: delegação total ✅ CONCLUÍDA (2026-04-17)

**Feito:** Todas as `src/app/api/**/route.ts` deixaram de importar `@/infrastructure/database/prisma` — lógica em `application/use-cases/` (ou infra dedicada como `resolvePublishedPathwayVersion`). Verificar com `rg 'from \"@/infrastructure/database/prisma\"' src/app/api --glob '**/route.ts'`.

**Último lote:** tenant (members, WhatsApp, notificações), admin (tenants + members), pathways (dashboard SLA, kanban, versões, publish-preview), patient-pathways (detalhe + dispatches), webhook WhatsApp.

---

## Apêndice A — ~~32 rotas com `RouteCtx` inline~~ ✅ FEITO

Todas as 32 rotas atualizadas para importar `RouteCtx<T>` de `@/types/api/route-context`.
