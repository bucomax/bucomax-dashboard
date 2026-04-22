# Regra: clean-architecture

Aplica-se a **todos os arquivos** do projeto.

## Direção das dependências

```
domain/         ← application/       ← infrastructure/    ← app/ / features/
(entidades,       (use cases,           (Prisma, GCS,        (Route Handlers,
 value objects,    ports/interfaces)     HTTP clients,         pages, adapters)
 erros)                                  BullMQ, email)
```

- **`domain/`** — **zero** imports de Prisma, Next.js `headers()`, `fetch`, React.
- **`application/`** — depende de `domain` e de tipos declarados nos ports.
- **`infrastructure/`** — implementações concretas dos ports.
- **`app/`** — adapters: Route Handlers chamam use cases; Server Components delegam a facades.

## Ports recomendados

| Port | Implementação típica |
|------|----------------------|
| `IPathwayRepository` / `IPatientPathwayRepository` | Prisma |
| `IFileStorage` | Presign GCS + metadados `FileAsset` |
| `INotificationEmitter` | BullMQ queue + Prisma + SSE pub/sub |
| `IWhatsAppOutbound` | HTTP para projeto chatbot |
| `IAiJobClient` | HTTP para serviço de IA |

## DTOs e mapeamento

- Tipos de DTO compartilhados em `src/types/` e `src/types/api/`.
- Entrada/saída HTTP **não** expor modelo Prisma cru se houver risco de vazar campos internos; mapear para DTO estável (`PatientDto`, `PathwayStageDto`).
- Use case retorna tipos do domínio ou DTO de aplicação; handler serializa.

## Configuração

- `process.env` apenas em **infra** ou módulo `config` (`src/lib/config/`) — não em entidades de domínio.
