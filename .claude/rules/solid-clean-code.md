# Regra: solid-clean-code

Aplica-se a **todos os arquivos** do projeto.

## SOLID (aplicação prática)

- **S** — Um use case = um fluxo de negócio coeso; separar `PublishPathwayVersion` de `TransitionPatientStage`.
- **O** — Novo canal (e-mail) = nova implementação de port, sem editar núcleo da transição.
- **L** — Implementações de repositório intercambiáveis em testes (in-memory vs Prisma).
- **I** — Ports pequenos (`dispatch(payload)` vs interface gigante "faz tudo").
- **D** — Use case depende de `IWhatsAppOutbound`, não de `axios` direto.

## Clean code

- **Nomes** que reflitam o domínio (`currentStageId`, não `step`).
- **Funções** curtas; um nível de abstração por função; early return.
- **DRY** com critério — duplicação de regra de negócio sim; boilerplate de mapeamento pode virar helper.
- **Async:** evitar `async` desnecessário; `Promise.all` só quando independente; não silenciar rejeições.

## Tipagem

- Evitar `any`; `unknown` + narrowing onde necessário.
- Tipos de erro discriminados (tagged unions ou classes com discriminante).
- `z.infer<typeof schema>` como fonte de verdade para DTOs.

## Testes

- Prioridade: transição de etapa (permissão, etapa inválida, bundle completo), presença de `tenantId` nos repositórios, mapeamento de erros de domínio.
- Nomes descritivos: `should reject transition when stage belongs to another version`.
- Usar fakes/in-memory para repositórios, não mocks que inventam comportamentos.

## Patterns do projeto

- API response: `jsonSuccess()` / `jsonError()` — não criar wrappers alternativos.
- Validação: Zod schemas em `src/lib/validators/` — não inline nas rotas.
- Guards: composição linear (`requireSessionOr401` → `getActiveTenantIdOr400` → `assertActiveTenantMembership`).
- Notificações: via `INotificationEmitter` port — não acessar Prisma diretamente para notifications.
