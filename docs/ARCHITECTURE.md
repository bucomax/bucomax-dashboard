# Arquitetura — iDoctor

Documento de referência da plataforma: dashboard multi-tenant, autenticação JWT, cadastro de clientes, jornada clínica por tenant, armazenamento em Cloudflare R2 e stack alinhada ao projeto de referência **kaber.ai** (mesmo diretório pai do repositório `idoctor`). **Escopo de produto**, **integrações** e **layout do painel** estão em [PRODUCT-SCOPE.md](./PRODUCT-SCOPE.md). O **modelo de dados** (pathway, etapas, paciente, transição, dispatch) e o **impacto nas camadas de código** são decisão arquitetural central — **§8** abaixo.

---

## 1. Objetivos

| Objetivo | Descrição |
|----------|-----------|
| Isolamento por tenant | Dados de negócio sempre vinculados a um `tenantId`; usuários acessam apenas tenants aos quais pertencem (exceto **admin geral**, com regras explícitas). |
| Permissionamento | Papéis **globais** (plataforma) e **por tenant** (escopo do cliente); APIs e UI respeitam a matriz de permissões. |
| API previsível | REST em `/api/v1/*`, validação com Zod, respostas padronizadas (sucesso/erro). |
| Auth stateless | JWT de acesso + refresh persistido (revogável), compatível com web e integrações. |
| Fluxos configuráveis | Definição de workflow em grafo (nodes/edges); execução com estado persistido. |
| Cadastro flexível | Formulários e etapas dinâmicas sem deploy a cada mudança de processo. |
| Arquivos seguros | Objetos no R2 com prefixo por tenant (e opcionalmente por cliente). |

---

## 2. Stack

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js (App Router) |
| Linguagem | TypeScript |
| UI | React, Tailwind CSS, shadcn/ui, Lucide React |
| HTTP cliente | Axios (interceptors: Bearer, refresh, erros) |
| Gráficos | Recharts ou Chart.js (definir no setup do projeto) |
| Editor de jornada | **@xyflow/react** — canvas do fluxo clínico; estado persistido + etapas materializadas |
| Banco | PostgreSQL |
| ORM | Prisma (`packages/prisma`, workspace npm) |
| Auth (web) | **NextAuth.js v4** (App Router), **Prisma Adapter**, provider Credentials (email/senha); callbacks para claims (`globalRole`, contexto de tenant) |
| Auth (API stateless, opcional) | JWT (`jsonwebtoken`) + refresh no banco para clientes externos — mesmo modelo `User` |
| Storage | Cloudflare R2 via API compatível S3 (`@aws-sdk/client-s3`) |
| Validação | Zod |
| Doc API | **Scalar** (`@scalar/nextjs-api-reference`) + **`public/openapi.json`** (OpenAPI 3) |

**Referência estrutural:** organização em `app/`, `src/application`, `src/domain`, `src/infrastructure`, `src/lib`, como no kaber.ai.

---

## 3. Estrutura de pastas (alvo)

```text
idoctor/
├── app/
│   ├── (auth)/                 # páginas públicas: login, recuperação de senha
│   ├── (dashboard)/            # área logada: layout, navegação, módulos
│   └── api/
│       └── v1/
│           ├── auth/           # login, refresh, logout, registro
│           ├── tenants/        # contexto, convites (se houver)
│           ├── clients/        # CRUD clientes (escopo tenant)
│           ├── workflows/      # definições de fluxo + publicação
│           ├── workflow-runs/  # instâncias, passos, webhooks
│           └── storage/        # upload / URLs assinadas
├── packages/
│   └── prisma/
│       ├── schema.prisma
│       └── migrations/
├── src/
│   ├── application/            # casos de uso por módulo (schemas Zod por pasta quando fizer sentido)
│   ├── domain/                 # entidades, erros de domínio
│   ├── infrastructure/         # Prisma, R2, e-mail, filas (futuro)
│   ├── types/                  # interfaces e types compartilhados (API, DTOs, UI); sem tipos soltos em app/
│   │   └── api/                # opcional: contratos v1 por recurso
│   └── lib/
│       ├── utils/              # funções auxiliares puras (format, parse, máscaras)
│       ├── constants/          # constantes nomeadas (limites, chaves, labels estáticos)
│       └── auth|api-response|… # integrações leves (JWT helpers, formato de resposta)
├── docs/
│   ├── ARCHITECTURE.md         # este arquivo (inclui modelo de dados §8)
│   ├── PRODUCT-SCOPE.md        # escopo, integrações IA/WhatsApp, UI dashboard
│   ├── DEV-PHASES.md           # etapas de dev (backend primeiro, NextAuth)
│   └── API-DOCS.md             # Scalar + OpenAPI (public/openapi.json)
└── public/
    └── openapi.json            # especificação OpenAPI 3 (Scalar /api-doc)
```

Convenções:

- **Route handlers** (`route.ts`) permanecem finos: parse → schema Zod → use case → resposta; **tipos/DTOs** importados de `src/types/` (não declarar interfaces soltas no arquivo da rota).
- **Componentes e páginas** importam tipos de `src/types/` ou `features/<x>/types.ts`; **utilitários** de `src/lib/utils/`; **constantes** de `src/lib/constants/`.
- **Regras de negócio** ficam em `src/application`.
- **Acesso a dados e externos** em `src/infrastructure`.
- **Zod:** schemas próximos ao use case ou em `src/lib/schemas/` / `src/types` inferidos com `z.infer<>` para alinhar tipo TypeScript ao runtime.

---

## 4. Multi-tenant

### 4.1 Modelo conceitual

- **Tenant:** organização (clínica, unidade de negócio). Campos típicos: nome, **slug** (usado em URL/subdomínio), `subdomain` ou hostname, status, plano.
- **User:** identidade global (e-mail único), com **papel global** opcional (ver seção 5.4).
- **TenantMembership:** vínculo `user` ↔ `tenant` com **papel no tenant** (`tenant_admin`, `tenant_user`, etc.).

Todo registro de negócio relevante inclui `tenantId` (Client, `CarePathway` / `PathwayStage`, `PatientPathway`, `StageTransition`, `File`, `AiJob`, …). Modelo relacional em **§8**.

### 4.2 Resolução do tenant

Combinações comuns (podem coexistir):

1. **Subdomínio (recomendado com hosts dedicados):** `clinica-xyz.idoctor.app` — o middleware lê o host, resolve `Tenant` pelo slug/subdomínio e injeta `tenantId` no contexto da request.
2. **Slug na URL no app principal:** `app.idoctor.app/dashboard/clinica-xyz/...` — mesmo tenant, rota explícita sem depender do Host.
3. **Header / query (API e admin geral):** `X-Tenant-Id` ou `?tenantId=` — útil para integrações e para o **admin geral** trocar de contexto sem mudar de subdomínio (ver seção 5.5).

O JWT deve refletir o **contexto ativo**: `sub` (userId), `tenantId` quando aplicável, `globalRole`, `tenantRole` no tenant atual. Toda operação valida esse contexto no servidor (nunca só no cliente).

### 4.3 Isolamento de dados

- Repositórios recebem `tenantId` e **sempre** filtram por ele.
- Para maior garantia em equipes grandes: avaliar **Row Level Security (RLS)** no PostgreSQL; para MVP, filtro explícito no Prisma é suficiente se seguido com rigor.

### 4.4 Subdomínio por tenant: automação na criação

Objetivo: ao **criar um novo tenant**, o sistema passa a responder em `https://<slug>.idoctor.app` (ou domínio customizado futuro) sem intervenção manual em DNS para cada cliente.

**Ideia central:** um único registro DNS “catch-all” na zona do domínio raiz; cada novo subdomínio **não** exige um novo registro A manual se você usar **wildcard**.

1. **DNS (Cloudflare ou outro provedor)**
   - Criar **`*.idoctor.app`** (wildcard) apontando para o mesmo destino da aplicação (ex.: load balancer, Netlify, Vercel, Cloudflare Workers/Pages, IP do cluster).
   - Opcional: **`idoctor.app`** (apex) para marketing; **`app.idoctor.app`** para o painel admin geral.

2. **TLS (HTTPS)**
   - Em Vercel/Netlify/Cloudflare Pages: certificados **wildcard** `*.idoctor.app` (muitos provedores emitem automaticamente ao validar o domínio raiz).
   - Sem wildcard, seria necessário emitir certificado por host (viável via API — ex.: Cloudflare SSL for SaaS — mas é mais complexo).

3. **O que “automatizar” no código ao criar o tenant**
   - Persistir `slug` (único) e, se usar hostname dedicado, `hostname` ou derivar `slug.idoctor.app`.
   - **Não** é obrigatório chamar API de DNS por tenant se o wildcard já cobre `*.idoctor.app`: basta o app resolver o subdomínio → tenant no middleware.
   - **Quando usar API de DNS por tenant:** domínios **customizados** (`clinica.com.br` apontando para sua app). Aí integrações como **Cloudflare for SaaS** (Custom Hostnames), ou criação de registros CNAME via API, passam a fazer sentido; fluxo típico: tenant solicita domínio → você gera verificação TXT/CNAME → após validação, o tráfego passa a ser aceito para aquele host.

4. **Fluxo resumido (wildcard)**

   ```text
   POST /api/v1/admin/tenants  →  grava Tenant (slug=clinica-a)
   Usuário acessa https://clinica-a.idoctor.app
   →  Middleware: host.split(".")[0] === "clinica-a"  →  busca Tenant por slug  →  contexto tenantId
   ```

5. **Cloudflare em específico (opcional, escala SaaS)**
   - **Custom Hostnames** para marcas white-label.
   - **Workers** na frente do Next.js para roteamento por host.
   - Manter **`tenantId` no banco** como fonte da verdade; host é apenas chave de resolução.

---

## 5. Autenticação e autorização

### 5.0 NextAuth (sessão web)

- **Route Handler:** `app/api/auth/[...nextauth]/route.ts`; configuração com `PrismaAdapter` e modelos `Account`, `Session`, `VerificationToken` no schema Prisma.
- **Sessão:** estratégia **JWT** recomendada para incluir `userId`, `globalRole` e, quando aplicável, `tenantId` / papéis nos callbacks `jwt` e `session`.
- **Variáveis:** `NEXTAUTH_URL`, `NEXTAUTH_SECRET` (obrigatórias).
- O dashboard Next.js usa **cookie de sessão** via NextAuth; APIs `/api/v1` podem validar com `getServerSession` / `auth()`. Para **mobile ou integrações**, ver fluxo JWT na tabela abaixo e [DEV-PHASES.md](./DEV-PHASES.md) (fase B5).

### 5.1 Fluxo JWT (alinhado ao kaber.ai) — API / clientes externos

| Componente | Descrição |
|------------|-----------|
| Access token | Curta duração; claims: `sub` (userId), `globalRole`, `tenantId` (contexto ativo), `tenantRole` (papel no tenant ativo). |
| Refresh token | Opaco ou JWT com `jti` único; persistido na tabela `RefreshToken` com expiração e revogação (`revokedAt`). |
| Login | `POST /api/v1/auth/login` → `access_token` + `refresh_token`. |
| Renovação | `POST /api/v1/auth/refresh` → novo access (e opcionalmente rotação do refresh). |
| Logout | `POST /api/v1/auth/logout` → revoga refresh pelo `jti`. |

### 5.2 Proteção

- Rotas de API protegidas: header `Authorization: Bearer <access_token>`.
- Middleware Next.js: proteger prefixos do dashboard e validar sessão/JWT conforme estratégia escolhida (cookie httpOnly **ou** apenas Bearer no cliente com armazenamento seguro).

### 5.3 Autorização (visão geral)

- **Usuário comum (não admin geral):** sempre verificar `TenantMembership` para o `tenantId` ativo; o `tenantRole` limita ações (CRUD clientes, workflows, etc.).
- **Admin geral:** ver seção 5.5 — bypass controlado com auditoria.

### 5.4 Modelo de permissionamento (global × tenant)

Dois eixos independentes:

| Eixo | Onde vive | Exemplos |
|------|-----------|----------|
| **Papel global** | Coluna em `User` ou tabela `PlatformRole` | `super_admin` (gestão da plataforma: criar tenants, ver todos os tenants); `null` ou `user` (usuário “normal” da plataforma). |
| **Papel no tenant** | `TenantMembership.role` | `tenant_admin` (configura o tenant, convida usuários, publica fluxos); `tenant_user` (opera dia a dia, sem apagar tenant ou gerir billing interno, conforme regra de negócio). |

**Matriz sugerida (ajustar ao produto):**

| Ação | Super admin (global) | Tenant admin | Tenant user |
|------|----------------------|--------------|-------------|
| Criar / suspender **tenant** | Sim | Não | Não |
| Listar **todos** os tenants | Sim | Não | Não |
| Entrar em qualquer tenant (contexto) | Sim (ver 5.5) | Apenas nos tenants onde é membro | Apenas nos tenants onde é membro |
| Convidar usuários ao tenant | Sim (se no contexto) / política | Sim | Não (ou sim, se permitir) |
| CRUD clientes, workflows, arquivos | Sim **no tenant ativo** | Sim | Conforme permissões finas |
| Publicar workflow | Sim no contexto | Sim | Não (típico) |

**Implementação no Prisma (conceito):**

- `User.globalRole` — enum: `super_admin | user` (ou mais valores depois).
- `TenantMembership.role` — enum: `tenant_admin | tenant_user | …`.

**Guards nas APIs:**

- `requireAuth` → `requireTenantContext` → `requireTenantRole(['tenant_admin'])` para rotas restritas.
- `requireSuperAdmin` para `POST /api/v1/admin/tenants`, listagens globais, etc.

**Princípio:** permissão efetiva = `globalRole` **OU** `tenantRole` conforme o recurso; nunca confiar só no front (sempre revalidar no use case).

### 5.5 Admin geral: navegar entre tenants de forma segura e “inteligente”

O super admin precisa **liberdade para operar em qualquer tenant** sem criar `TenantMembership` falso para cada combinação, mas com **rastreabilidade**.

**Opção A — Contexto de tenant explícito (recomendada)**

1. Login do super admin em `app.idoctor.app` (ou domínio central).
2. Lista de tenants (busca, favoritos, recentes) no **Tenant switcher** (componente na topbar, tipo “workspace” do Slack/Notion).
3. Ao selecionar um tenant:
   - **Front:** grava `activeTenantId` (estado global + `localStorage` opcional) e chama `POST /api/v1/auth/context` com `{ tenantId }` **ou** recebe novo **access token** com `tenantId` + `tenantRole: "super_admin_impersonation"` embutido.
   - **Back:** valida `User.globalRole === super_admin`; emite token com `tenantId` ativo e flag `actingAsSuperAdmin: true` (claim interna) para auditoria.

4. Todas as requests subsequentes usam esse `tenantId` como escopo; repositórios aplicam o mesmo filtro que um tenant admin.

**Opção B — Impersonação com audit log**

- Claims extras: `impersonatorUserId` (sempre o super admin real) e `effectiveTenantId`.
- Tabela `AuditLog`: `actorUserId`, `tenantId`, `action`, `payload`, `ip`, `userAgent` — obrigatório para ações sensíveis quando `actingAsSuperAdmin`.

**Opção C — Subdomínio + cookie de contexto**

- Super admin abre `https://clinica-a.idoctor.app` já logado: middleware confere JWT; se `super_admin`, permite acesso a esse host sem membership; caso contrário exige membership.
- Complementar ao switcher central: deep links diretos por tenant.

**UX “inteligente” sugerida**

- **Busca global** de tenant por nome/slug.
- **Recentes** e **fixados** (pins) no switcher.
- Indicador visual claro: **“Você está em: [Tenant X] como administrador da plataforma”** com botão **Sair do contexto** (volta à visão global sem tenant).
- Rotas: `app.idoctor.app/admin/tenants` (só super admin) vs `.../dashboard/...` escopado ao tenant ativo.

**Endpoints úteis**

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/admin/tenants` | Lista paginada (só `super_admin`). |
| POST | `/api/v1/admin/tenants` | Cria tenant (+ slug para subdomínio); opcionalmente primeiro `tenant_admin`. |
| POST | `/api/v1/auth/context` | Define `tenantId` ativo no token (super admin ou usuário com membership). |
| DELETE | `/api/v1/auth/context` | Limpa contexto de tenant (volta modo global para super admin). |

---

## 6. Cadastro de clientes e dados cadastrais

**Ordem de uso:** primeiro **`Client`** (cadastro); depois **`PatientPathway`** (escolha do fluxo + primeira etapa); em seguida **transições** de etapa — ver [PRODUCT-SCOPE.md](./PRODUCT-SCOPE.md) (ordem operacional). Na UI, isso pode ser um **wizard** (dados → fluxo → salvar tudo no final).

Campos alinhados ao produto:

| Campo | Observação |
|-------|------------|
| Nome | Texto |
| Telefone **WhatsApp** | Principal canal; normalizar (E.164) para integração com o chatbot |
| Descrição do caso | Texto / resumo clínico (`caseSummary` ou `caseDescription`) |
| Documento | CPF/CNPJ conforme regra do tenant (validação + Zod) |
| Endereço | Opcional; colunas estruturadas ou JSON validado |

**Entidade sugerida:** `Client` com `tenantId` obrigatório; índices para busca por documento ou telefone **dentro do tenant** quando fizer sentido (`@@unique` apenas se regra de negócio exigir).

---

## 7. Fluxos de atendimento

**Produto (negócio):** a **jornada do paciente** é um fluxo **por tenant**; o tenant pode ter **vários** fluxos (ex.: tipos de tratamento), com **templates padrão** da plataforma e **edição visual** com **@xyflow/react** (adicionar/remover etapas), persistida no banco. Ao **iniciar** a jornada num paciente: **um único** fluxo → associação **automática**; **mais de um** → escolha explícita do fluxo. Ao **entrar** numa etapa nova, o paciente recebe o **pacote integral** de documentos; o **chatbot** envia mensagem + anexos. Detalhe em [PRODUCT-SCOPE.md](./PRODUCT-SCOPE.md) §3.1–3.2.

**Implementação:** `CarePathway` (múltiplos por tenant), `PathwayVersion` com **JSON React Flow** + **`PathwayStage`** materializado, `StageDocument`, **`PatientPathway`** (referência a `pathwayId` + `currentStageId`), **`StageTransition`**, **`ChannelDispatch`**. Motor n8n genérico (`WorkflowDefinition`) permanece **opcional** para cenários futuros. Detalhe em **§8**.

### 7.1 Conceitos (motor genérico / n8n)

| Conceito | Descrição |
|----------|-----------|
| **WorkflowDefinition** | Nome, versão, status (`draft` / `published`), `tenantId`. |
| **Grafo** | JSON serializado compatível com React Flow: `nodes[]`, `edges[]`. Cada node: `id`, `type`, `position`, `data` (config específica). |
| **Tipos de node (exemplos)** | `trigger`, `form`, `condition`, `http`, `delay`, `notify_whatsapp`, `call_ai`, `end`. |
| **WorkflowRun** | Instância em execução: referência à definição (e versão), `status`, `currentNodeId` ou fila de passos, `context` (JSON com variáveis e respostas). **Alternativa:** instância = paciente + `currentStageId` na jornada clínica. |

### 7.2 Cadastro dinâmico

- Schemas de formulário podem ser armazenados por node `form` ou em entidade **`FormSchema`** (por tenant).
- Runtime: renderização dinâmica a partir do schema (campos, validação, máscaras).

### 7.3 Execução

- **Motor síncrono:** use case `execute-step` — dado `runId`, avança conforme tipo do node.
- **Motor assíncrono:** jobs (tabela de fila, Cloudflare Queue ou worker) para HTTP externo, delays longos, integrações.

Webhooks de retorno (paralelo ao padrão de webhooks do kaber.ai) podem atualizar `WorkflowRun` e disparar o próximo passo.

---

## 8. Modelo de dados e impacto no código (decisão arquitetural)

Esta secção fixa **como** o produto se materializa em **PostgreSQL/Prisma** e nas **camadas** da aplicação. É o contraponto entre um motor genérico tipo n8n e a **jornada clínica** que adotamos no MVP.

### 8.1 Relação com um “workflow genérico n8n”

| Antes (só técnico) | Depois (produto atual) |
|--------------------|-------------------------|
| `WorkflowDefinition` com grafo livre como centro | **Jornada clínica** (`CarePathway`): **vários** por tenant; **templates** padrão; edição com **@xyflow/react** persistida em JSON + etapas materializadas. |
| `WorkflowRun` abstrato | **Estado do paciente** (`PatientPathway`): **qual fluxo** (`pathwayId`), etapa atual, versão, transições. **Seleção de fluxo** na entrada: automática se só existir um. |
| “Notificar externo” genérico | **Pacote de documentos da etapa** + mensagem → **API do chatbot**; persistência de **cada disparo** (idempotência, suporte). |
| Arquivo solto no R2 | **`File`** na biblioteca do tenant; **N:N** etapa ↔ arquivo (`StageDocument`) para montar `documents[]` na transição. |

O **schema mínimo** é **pathway (múltiplos) + version (graphJson + stages) + patient_pathway + dispatch**. Grafo n8n genérico é **opcional** além disso.

### 8.2 Tabelas e relacionamentos (núcleo)

#### Núcleo da jornada (por tenant)

| Modelo | Campos-chave | Observação |
|--------|--------------|------------|
| `PathwayTemplate` (opcional) | `id`, `key`, `name`, `graphJson` ou definição seed | Templates **padrão** da plataforma (ex.: jornada “cirurgia”); clonados para o tenant. |
| `CarePathway` | `id`, `tenantId`, `name`, `slug?`, `clonedFromTemplateId?`, `createdAt` | **Múltiplos** por tenant; slug único no tenant para URLs. |
| `PathwayVersion` | `id`, `pathwayId`, `version`, `status`, `graphJson` (React Flow: `nodes`, `edges`), `publishedAt`, `createdAt` | Canvas **@xyflow/react** persistido; ao salvar/publicar, **sincronizar** `PathwayStage` com os nodes de etapa. |
| `PathwayStage` | `id`, `pathwayVersionId`, `order` ou `nodeId`, `title`, `patientMessageTemplate?`, flags (notificar, IA) | Materialização para queries, FKs e `StageDocument`. |
| `StageDocument` | `id`, `pathwayStageId`, `fileId`, `sortOrder` | **N:N** etapa ↔ arquivo; **pacote integral** ao WhatsApp. |

**Índices sugeridos:** `PathwayStage(pathwayVersionId, order)` único; `StageDocument(pathwayStageId, sortOrder)`.

#### Paciente na jornada

| Modelo | Campos-chave | Observação |
|--------|--------------|------------|
| `Client` | `tenantId`, cadastro, `phone` (E.164) | Telefone para o chatbot. |
| `PatientPathway` | `tenantId`, `clientId`, **`pathwayId`**, `pathwayVersionId`, **`currentStageId`** → `PathwayStage`, `startedAt`, `status` | **Qual fluxo** o paciente segue. **UX:** ao criar, se o tenant tiver **um** fluxo publicado, preencher `pathwayId` automaticamente; se **vários**, exigir escolha na UI antes de persistir. |

**Regras:** `currentStageId` pertence ao `pathwayVersionId` ativo; `pathwayId` coerente com a versão.

#### Transições e canal

| Modelo | Campos-chave | Observação |
|--------|--------------|------------|
| `StageTransition` | `tenantId`, `clientId`, `fromStageId?`, `toStageId`, `pathwayVersionId`, `actorUserId`, `createdAt`, `correlationId` | Histórico; `correlationId` amarra um disparo. |
| `ChannelDispatch` | `transitionId`, `channel` (`whatsapp`), `payloadSnapshot`, `status`, `externalMessageId?`, `error?`, `createdAt` | Idempotência e diagnóstico. |

#### Arquivos e IA

| Modelo | Observação |
|--------|------------|
| `File` | `tenantId`, `key`, `mimeType`, `size`; opcional `purpose` (`library` \| `stage_attachment`). Upload na biblioteca **não** dispara WhatsApp sozinho. |
| `AiJob` | `tenantId`, `clientId`, `pathwayStageId?`, `transitionId?`, `type`, `idempotencyKey`, `status`, `externalJobId`, `resultJson?`, … |

Auth/plataforma (`User.globalRole`, `TenantMembership`, `RefreshToken`, `AuditLog`) permanece como já descrito nas secções anteriores.

### 8.3 Consultas que o modelo precisa suportar

1. **Payload WhatsApp ao mover etapa:** `StageDocument` ⋈ `File` filtrando `pathwayStageId = toStageId`, `ORDER BY sortOrder` + URLs assinadas em lote.  
2. **Pacientes “na etapa X”:** `PatientPathway` com `currentStageId` nas etapas de ordem desejada.  
3. **Ficha / timeline:** `StageTransition` + `ChannelDispatch` + `AiJob` por `clientId`.

### 8.4 Impacto no código (camadas)

| Camada | O que entra |
|--------|-------------|
| **`src/domain`** | Entidades/VOs: pathway, stage, `PatientPathway`, transição, `DispatchPayload`; erros: `InvalidStageTransition`, `DispatchFailed`. |
| **`src/application`** | Casos de uso: `CreateOrUpdatePathwayDraft`, `PublishPathwayVersion`, **`TransitionPatientStage`** (persistir → bundle → `DispatchWhatsApp` → opcional `EnqueueAiJob`), `BuildStageDocumentBundle`, `DispatchWhatsApp`. |
| **`src/infrastructure`** | Repositórios (sempre `tenantId`); `R2Presigner` em lote; `WhatsAppChannelClient`; `AiClient`. |
| **`app/api/v1`** | `…/pathways`, `…/templates`, `…/versions` (save `graphJson`), `…/stages`; `POST …/patients/:id/pathway` (início / troca de fluxo); `POST …/transition`; `GET …/timeline`; webhooks. |
| **Frontend** | **Editor @xyflow/react** + painel de propriedades da etapa (docs); ficha paciente: **seletor de fluxo** se `count(pathways) > 1`; transição de etapa + invalidação de cache. |

Eventos de domínio (opcional): após `TransitionPatientStage`, worker assíncrono só para IA — desacopla HTTP.

### 8.5 O que não é obrigatório no MVP

- Motor **n8n** genérico (`WorkflowDefinition` arbitrário) além do fluxo clínico com **XYFlow + stages**.
- Ramificações complexas no grafo: o MVP pode restringir a **topologia linear** no canvas (uma “linha” de etapas) e evoluir depois.

### 8.6 Ordem sugerida de migração

1. `CarePathway` → `PathwayVersion` → `PathwayStage` → `StageDocument` + `File`.  
2. `PatientPathway`.  
3. `StageTransition` + `ChannelDispatch` + stub WhatsApp.  
4. `AiJob` + webhook.  
5. UI: editor **@xyflow/react** + templates + ficha (seleção de fluxo quando >1).

### 8.7 Resumo

| Camada | Mudança principal |
|--------|-------------------|
| **BD** | Núcleo **pathway / version / stage / stage_document** + **patient_pathway** + **stage_transition** + **channel_dispatch** + **ai_job**. |
| **Código** | Orquestração centrada em **transição de etapa** e **bundle de documentos**; APIs REST alinhadas. |
| **Front** | Editor **XYFlow** + ficha; canvas n8n genérico só se precisar além da jornada. |

---

## 9. Armazenamento (Cloudflare R2)

| Aspecto | Prática recomendada |
|---------|---------------------|
| Bucket | Um bucket; isolamento por **prefixo** `tenants/{tenantId}/...` |
| Upload | Presigned URL para upload direto do browser **ou** `POST` multipart para API que grava no R2 (como referência no kaber.ai) |
| Metadados | Tabela `File` (ou `Asset`): `tenantId`, `clientId` opcional, `key`, `mimeType`, `size`, `createdAt` |
| Exclusão | Política de lifecycle ou job de limpeza ao apagar entidade dona do arquivo |

Variáveis de ambiente típicas: endpoint R2, `accessKeyId`, `secretAccessKey`, nome do bucket, região (se aplicável).

---

## 10. API — visão de endpoints (alvo)

Prefixo: `/api/v1`.

| Área | Métodos | Descrição resumida |
|------|---------|---------------------|
| Auth | POST | login, refresh, logout, register, forgot/reset password |
| Auth / context | POST, DELETE | definir ou limpar **tenant ativo** no token (super admin e usuários com membership) |
| Admin / tenants | GET, POST, PATCH | **super admin:** listar todos, criar tenant (slug/subdomínio), suspender |
| Tenants | GET | tenants **acessíveis** ao usuário (membership + política super admin) |
| Members | GET, POST, DELETE | membros e **papéis no tenant** (`tenant_admin`, `tenant_user`) |
| Clients | GET, POST, PATCH, DELETE | CRUD com escopo tenant |
| Pathways / templates | GET, POST | listar **templates**; criar `CarePathway` a partir de template ou vazio |
| Pathways / versions / stages | GET, POST, PATCH | salvar **`graphJson`** (React Flow), publicar; etapas + `StageDocument` |
| Patients / pathway | GET, POST, PATCH | iniciar jornada (**escolher fluxo** se >1); estado `PatientPathway`; `POST …/transition` |
| Patients / timeline | GET | transições, dispatches, jobs IA |
| Workflows (opcional) | GET, POST, PATCH | grafo n8n; publicar versão |
| Workflow runs (opcional) | GET, POST | se usar grafo paralelo |
| Webhooks | POST | `ai`, `chatbot` |
| Storage | POST, GET | URL de upload; metadados |
| Health | GET | saúde da API e conexão com banco |

### 10.1 Documentação interativa (Scalar + OpenAPI)

- **Spec:** `public/openapi.json` (OpenAPI 3.x) — paths sob `/api/v1`, `components.schemas` alinhados aos DTOs em `src/types/`.
- **UI:** [Scalar](https://scalar.com/) via pacote **`@scalar/nextjs-api-reference`**; página dedicada (ex.: `/api-doc`) carrega o spec e habilita **Try it**.
- **Segurança no doc:** `securitySchemes` com **Bearer** (JWT); operações protegidas referenciam esse scheme.
- Manutenção obrigatória: **cada mudança de contrato** na API deve atualizar o `openapi.json`.
- Detalhes de setup e checklist: **[API-DOCS.md](./API-DOCS.md)**.

---

## 11. Frontend (dashboard)

| Tema | Decisão |
|------|---------|
| Layout | Sidebar + área de conteúdo; tema claro/escuro via shadcn |
| Dados | TanStack Query (recomendado) + Axios para cache e estados de loading/erro |
| Fluxos | Canvas React Flow; painel lateral para propriedades do node selecionado |
| Gráficos | Cards com KPIs por tenant; filtros por período |
| Super admin | Página `/admin/tenants` (ou rota equivalente); **Tenant switcher** na barra superior (busca, recentes, pins); banner quando `actingAsSuperAdmin` |
| Resolução de host | Middleware Next.js: se hostname = `*.idoctor.app`, resolver slug → `tenantId` e alinhar com token/context |

---

## 12. Segurança — checklist

- [ ] Senhas com bcrypt (custo adequado).
- [ ] Rate limit em login e refresh (middleware ou edge).
- [ ] CORS restrito a origens conhecidas em produção.
- [ ] Validação de entrada em todos os bodies (Zod).
- [ ] Nunca confiar em `tenantId` vindo só do cliente; derivar do token + membership **ou** de `super_admin` validado no servidor.
- [ ] Ações do super admin em tenant: **audit log** (quem, quando, qual tenant, qual ação).
- [ ] Rotas `/api/v1/admin/*` recusam usuários sem `globalRole === super_admin`.
- [ ] URLs assinadas com expiração curta para upload/download.

---

## 13. Roadmap de implementação sugerido

1. Monorepo Next + `packages/prisma`: `Tenant`, `User` (com `globalRole`), `TenantMembership` (com `tenant_admin` / `tenant_user`), `RefreshToken`.
2. Auth `/api/v1/auth/*`, `/api/v1/auth/context` + guards de super admin + middleware (host + dashboard).
3. CRUD `Client` com isolamento por tenant.
4. Integração R2 + entidade de metadados de arquivo.
5. **Jornada:** `CarePathway` → `PathwayVersion` → `PathwayStage` + `StageDocument`; UI editor (lista de etapas + docs).
6. **Paciente na jornada:** `PatientPathway` + `POST …/transition` + `StageTransition` + `ChannelDispatch` + cliente WhatsApp (stub).
7. `AiJob` + webhook IA; opcional: `WorkflowDefinition` + React Flow se precisar de ramificações.
8. Formulários dinâmicos (se necessário) e dashboard analítico (gráficos).

---

## 14. Referência externa de projeto

A base de organização (pastas, Prisma em pacote, JWT, R2, rotas `v1`) segue o repositório local **kaber.ai** (`…/kaber.ai`). Adaptações principais: **multi-tenant**, **RBAC**, **jornada clínica** (pathway/stage/paciente/transição/dispatch), **integrações IA e WhatsApp**, **subdomínios**.

---

*Última atualização: §8 incorpora modelo de dados e impacto no código (jornada do paciente).*
