# Regra: application-layer

Aplica-se a arquivos em `src/application/**/*.ts` e `src/domain/**/*.ts`.

## Onde fica a regra de negócio

- **Somente** em `domain/` e `application/`. Rotas e componentes **orquestram**, não duplicam regra crítica.

## Use cases principais

| Caso de uso | Responsabilidade |
|-------------|------------------|
| `CreateOrUpdatePathwayDraft` / `SavePathwayGraph` | `graphJson` (@xyflow/react) + sincronizar `PathwayStage` e `StageDocument` |
| `ClonePathwayFromTemplate` | Novo `CarePathway` a partir de `PathwayTemplate` |
| `StartPatientPathway` | Criar `PatientPathway` com `pathwayId` (se único fluxo publicado, permite default) |
| `PublishPathwayVersion` | Publicar versão; opcionalmente migrar pacientes |
| `TransitionPatientStage` | Pipeline completo: transição + bundle + dispatch (+ IA opcional) |
| `BuildStageDocumentBundle` | Lista ordenada de `File` + preparação para presign |
| `DispatchWhatsApp` | Chamar port do canal; persistir resultado |

## Transação e consistência

- Transição que grava DB + dispatch: usar **transação Prisma** para estado + `StageTransition`.
- Dispatch externo **após** commit com compensação (retry) se HTTP falhar.
- Não deixar `PatientPathway` atualizado sem `StageTransition` correspondente (exceto migração de dados com script explícito).

## Repositórios

- Assinaturas com `tenantId` obrigatório.
- Métodos que buscam por `id` também recebem `tenantId` para evitar cross-tenant.

## Ports (interfaces na application)

- `PathwayRepository`, `PatientPathwayRepository`, `FileStorage` (presign), `WhatsAppOutbound`, `AiJobDispatcher`, `NotificationEmitter`.
- Infra implementa; testes usam fakes/in-memory.

## Erros de domínio

- Tipos explícitos (`InvalidStageTransition`, `PathwayNotPublished`, `DispatchFailed`).
- Mapeados na API para HTTP 4xx/5xx adequados.
- Usar tagged unions ou classes com discriminante para narrowing no handler.
