# Plano: Auditoria E2E, Acesso do Paciente e Senha no Portal

> Status: **em execução** | Criado: 2026-04-14

### Progresso (marcação local)

| Fase | Status |
|------|--------|
| **Fase 1** — model `portalPasswordHash`, validação forte, auto-cadastro com senha, hash no POST, audit `PATIENT_PORTAL_PASSWORD_SET`, timeline | **Concluída** |
| **Fase 2** — login CPF+senha, `POST /patient/password`, esqueci senha via OTP → `/patient/set-password`, UI portal | **Concluída** |
| **Fase 3** — enum `AuditEvent` ampliado, `clientId` opcional, rotas com `recordAuditEvent`, labels na timeline da ficha | **Concluída** |
| **Fase 4** — link rápido: `useCopyPortalLink` + ação na lista de pacientes; ficha já tinha copiar no card do portal | **Concluída** |
| **Fase 5** — rate limit 5/15min no login por senha (`patientPortalPassword`), `Client.portalPasswordChangedAt` + `pwdv` no cookie (invalida sessão após troca), audit `PATIENT_PORTAL_LOGIN_FAILED` | **Concluída** |
| **Fase 6** — timeline: filtro por categoria (`?categories=`), ícone + borda por categoria; auto-cadastro: checkboxes termos/LGPD + audit `PATIENT_CONSENT_GIVEN` (versões em constantes) | **Concluída** |
| **Fase 7** — exportação CSV auditoria (`GET /clients/:id/audit-export`), `sha256Hash` no `FileAsset`, audit `AUDIT_EXPORT_GENERATED` | **Concluída** |

---

## 1. Contexto

Hoje o sistema tem:
- **6 tipos de audit event** (`STAGE_TRANSITION`, `FILE_UPLOADED_TO_CLIENT`, `SELF_REGISTER_COMPLETED`, `PATIENT_PORTAL_FILE_SUBMITTED/APPROVED/REJECTED`) — cobre apenas transições e arquivos.
- **Portal do paciente 100% passwordless** — acesso via magic link (token 32 bytes, TTL 72h) ou OTP por CPF (6 dígitos, TTL 15min). Nenhuma senha no model `Client`.
- **Link do portal** acessível via dialog (`PatientPortalAccessDialog`) dentro da ficha do paciente — exige abrir modal para copiar.
- **Auto-cadastro** coleta nome, telefone, CPF, endereço, guardião — sem campo de senha.

### Problemas identificados
1. Gaps críticos na auditoria — login staff, acesso portal, download de arquivos, CRUD de paciente, ciclo de vida do pathway, mudanças de senha e geracao de links nao geram eventos.
2. Paciente acessa o painel sem senha — qualquer pessoa com o link/token entra diretamente.
3. Link do portal nao esta acessivel de forma rapida — precisa abrir modal para copiar.
4. Auto-cadastro nao coleta senha — paciente fica sem credencial propria.

---

## 2. Escopo das mudancas

### 2.1 Auditoria de ponta a ponta

**Objetivo:** todo evento relevante para compliance (LGPD), processos juridicos e avaliacao clinica gera `AuditEvent` rastreavel.

#### 2.1.1 Novos tipos de evento

Adicionar ao enum `AuditEventType` (schema.prisma):

| Tipo | Quando | Payload (sem PII) |
|------|--------|--------------------|
| `STAFF_LOGIN_SUCCESS` | NextAuth authorize OK | `{ userId, method: "credentials" }` |
| `STAFF_LOGIN_FAILED` | NextAuth authorize falha | `{ email (hash), reason }` |
| `STAFF_PASSWORD_CHANGED` | `PATCH /api/v1/me/password` | `{ userId }` |
| `STAFF_PASSWORD_RESET` | `POST /api/v1/auth/reset-password` | `{ userId }` |
| `PATIENT_PORTAL_SESSION_CREATED` | Exchange de token ou OTP verify | `{ method: "magic_link" \| "otp" \| "password", clientId }` |
| `PATIENT_PORTAL_LINK_GENERATED` | `POST /clients/[id]/portal-link` | `{ tokenId, singleUse, ttlMs }` |
| `PATIENT_PORTAL_PASSWORD_SET` | Paciente define/altera senha | `{ clientId }` |
| `PATIENT_CREATED` | `POST /api/v1/clients` | `{ clientId }` |
| `PATIENT_UPDATED` | `PATCH /api/v1/clients/[id]` | `{ clientId, changedFields[] }` |
| `PATIENT_DELETED` | `DELETE /api/v1/clients/[id]` | `{ clientId, deletedByUserId }` |
| `PATIENT_PATHWAY_STARTED` | `POST /api/v1/patient-pathways` | `{ patientPathwayId, pathwayId }` |
| `PATIENT_PATHWAY_COMPLETED` | `POST .../complete` | `{ patientPathwayId }` |
| `FILE_DOWNLOADED_BY_STAFF` | `GET /files/presign-download` | `{ fileAssetId, userId }` |
| `FILE_DOWNLOADED_BY_PATIENT` | `GET /patient/files/presign-download` | `{ fileAssetId, clientId }` |
| `CHECKLIST_ITEM_TOGGLED` | `PATCH .../checklist-items/[id]` | `{ itemId, checked, userId }` |
| `FILE_DELETED` | `DELETE /files/[id]` | `{ fileAssetId, userId }` |

#### 2.1.2 Implementacao

**Arquivos a alterar:**

| Arquivo | O que fazer |
|---------|-------------|
| `packages/prisma/schema.prisma` | Adicionar novos valores ao enum `AuditEventType` |
| `src/app/api/auth/[...nextauth]/route.ts` | Hook no callback `signIn` para `STAFF_LOGIN_SUCCESS/FAILED` |
| `src/app/api/v1/me/password/route.ts` | Chamar `recordAuditEvent` apos alterar senha |
| `src/app/api/v1/auth/reset-password/route.ts` | Chamar `recordAuditEvent` apos reset |
| `src/app/api/v1/public/patient-portal/[tenantSlug]/exchange/route.ts` | `PATIENT_PORTAL_SESSION_CREATED` apos exchange |
| `src/app/api/v1/public/patient-portal/[tenantSlug]/otp/verify/route.ts` | `PATIENT_PORTAL_SESSION_CREATED` apos OTP verify |
| `src/app/api/v1/clients/[clientId]/portal-link/route.ts` | `PATIENT_PORTAL_LINK_GENERATED` |
| `src/app/api/v1/clients/route.ts` (POST) | `PATIENT_CREATED` |
| `src/app/api/v1/clients/[clientId]/route.ts` (PATCH) | `PATIENT_UPDATED` com `changedFields` |
| `src/app/api/v1/clients/[clientId]/route.ts` (DELETE) | `PATIENT_DELETED` |
| `src/app/api/v1/patient-pathways/route.ts` (POST) | `PATIENT_PATHWAY_STARTED` |
| `src/app/api/v1/patient-pathways/[id]/complete/route.ts` | `PATIENT_PATHWAY_COMPLETED` |
| `src/app/api/v1/files/presign-download/route.ts` | `FILE_DOWNLOADED_BY_STAFF` |
| `src/app/api/v1/patient/files/presign-download/route.ts` | `FILE_DOWNLOADED_BY_PATIENT` |
| `src/app/api/v1/patient-pathways/[id]/checklist-items/[itemId]/route.ts` | `CHECKLIST_ITEM_TOGGLED` |
| `src/lib/clients/client-timeline.ts` | Renderizar novos tipos na timeline |
| `src/features/clients/app/components/client-detail-timeline-section.tsx` | Labels/icones dos novos tipos |

**Regra LGPD:** payload nunca contem CPF, telefone, conteudo clinico — apenas IDs internos e metadados estruturais.

#### 2.1.3 UI de auditoria (melhoria na timeline existente)

- Adicionar **filtro por tipo de evento** na timeline do paciente (dropdown multi-select).
- Adicionar **indicador visual** por categoria (icone + cor): seguranca (login/senha), clinico (transicao/checklist), documentos (upload/download), administrativo (CRUD paciente).
- Considerar futuramente: tela de auditoria global para `tenant_admin` (fora deste escopo inicial).

---

### 2.2 Senha no portal do paciente

**Objetivo:** paciente autentica com CPF + senha (alem dos metodos existentes magic link e OTP).

#### 2.2.1 Model (Prisma)

Adicionar ao model `Client`:

```prisma
/// Bcrypt hash da senha do portal. Null = paciente sem senha (usa magic link ou OTP).
portalPasswordHash  String?
```

**Migration:** campo nullable, sem impacto nos registros existentes.

#### 2.2.2 Regras de validacao da senha

| Regra | Criterio |
|-------|----------|
| Comprimento minimo | 8 caracteres |
| Letra maiuscula | pelo menos 1 `[A-Z]` |
| Letra minuscula | pelo menos 1 `[a-z]` |
| Numero | pelo menos 1 `[0-9]` |
| Caractere especial | pelo menos 1 `[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]` |

**Schema Zod:** criar `portalPasswordSchema` em `src/lib/validators/patient-portal-auth.ts`.

#### 2.2.3 Auto-cadastro: campo de senha

**Arquivo:** `src/features/clients/app/pages/patient-self-register-page.tsx`

Mudancas:
1. Adicionar campos `password` e `confirmPassword` ao formulario.
2. Componente `PasswordStrengthIndicator` — checklist visual mostrando em tempo real quais criterios foram cumpridos (checkmark verde / X vermelho para cada regra).
3. Validacao Zod com `refine` para `password === confirmPassword`.
4. Backend (`POST /api/v1/public/patient-self-register`): hash com bcrypt, salvar em `Client.portalPasswordHash`.
5. Audit event: `PATIENT_PORTAL_PASSWORD_SET`.

**Layout do indicador de forca:**

```
Senha: [••••••••••]
  [x] Minimo 8 caracteres
  [x] Letra maiuscula
  [x] Letra minuscula
  [ ] Numero
  [ ] Caractere especial

Confirmar senha: [••••••••••]
  [x] Senhas coincidem
```

Cada item muda de cinza/vermelho para verde conforme o usuario digita. Botao de submit desabilitado ate todos os criterios OK.

#### 2.2.4 Login do portal com senha

**Arquivo:** `src/app/[locale]/(patient)/[tenantSlug]/patient/login/`

Fluxo atual: CPF -> envia OTP -> digita codigo.

Novo fluxo:
1. Paciente digita CPF.
2. Se `Client.portalPasswordHash` existe -> mostra campo de senha (com opcao "Esqueci minha senha" que cai no fluxo OTP).
3. Se nao tem senha -> fluxo OTP atual (sem mudanca).
4. Backend: `POST /api/v1/public/patient-portal/[tenantSlug]/password/verify` — valida CPF + bcrypt compare -> set session cookie.
5. Audit event: `PATIENT_PORTAL_SESSION_CREATED` com `method: "password"`.

#### 2.2.5 Alterar/definir senha pelo portal

- Rota: `POST /api/v1/patient/password` (autenticado via cookie do portal).
- Se ja tem senha: exige senha atual + nova senha.
- Se nao tem senha (migrado de magic link): so exige nova senha.
- Audit event: `PATIENT_PORTAL_PASSWORD_SET`.
- Acessivel na pagina de perfil do portal.

#### 2.2.6 "Esqueci minha senha"

- Reutiliza o fluxo OTP existente (CPF -> OTP por email/WhatsApp).
- Apos verificar OTP, redireciona para tela de definir nova senha.
- Nao cria fluxo novo — apenas encadeia OTP verify -> set password.

---

### 2.3 Link de acesso do paciente (copia facil)

**Objetivo:** staff copia o link do portal do paciente sem abrir modal.

#### 2.3.1 Opcao A: Botao inline na listagem de pacientes (recomendada)

Na tabela de pacientes (`ClientsPage`), adicionar um botao de acao rapida na coluna de acoes:

```
[ icone link ] -> click -> gera link + copia para clipboard + toast "Link copiado!"
```

- Chama `POST /api/v1/clients/[id]/portal-link` com `{ sendEmail: false }` (mesmo endpoint existente).
- Icone: `Link` ou `ExternalLink` do Lucide.
- Feedback: toast de sucesso com o link (permite colar imediatamente).
- Tooltip: "Copiar link do portal do paciente".

#### 2.3.2 Opcao B: Badge/botao na ficha do paciente

Na pagina de detalhe do paciente (`ClientDetailPage`), no header/card de info:

```
Portal do paciente: [ Copiar link ] [ QR Code ]
```

- Botao `Copiar link`: gera + copia (1 click).
- Botao `QR Code`: abre o dialog existente (`PatientPortalAccessDialog`).

#### 2.3.3 Recomendacao

Implementar **ambas**: acao rapida na listagem (A) + botoes no header da ficha (B). A listagem resolve o caso "preciso enviar o link rapido para varios pacientes". A ficha resolve "estou vendo este paciente e quero compartilhar".

---

### 2.4 Gaps adicionais identificados

#### 2.4.1 Rate limit no login por senha

- Implementar rate limit por CPF no endpoint de login por senha (ex.: 5 tentativas em 15min).
- Apos exceder: bloquear temporariamente e exigir OTP.
- Audit event: `STAFF_LOGIN_FAILED` equivalente para portal (`PATIENT_PORTAL_LOGIN_FAILED`).

#### 2.4.2 Expirar sessao do portal apos troca de senha

- Quando o paciente troca a senha, invalidar sessoes ativas.
- Hoje a sessao e stateless (cookie HMAC) — precisaria de um `passwordChangedAt` no `Client` e checar no `requireActivePatientPortalClient`.

#### 2.4.3 Auditoria de consentimento (LGPD)

- No auto-cadastro, registrar aceite dos termos de uso/LGPD como audit event.
- Novo tipo: `PATIENT_CONSENT_GIVEN` com payload `{ consentType: "terms" | "lgpd", version }`.
- Guardar timestamp do aceite — importante para processos juridicos.

#### 2.4.4 Notificacao ao staff quando paciente acessa o portal

- Notificacao tipo `patient_portal_accessed` para o staff responsavel (`assignedToUserId`).
- Util para saber que o paciente esta ativo e visualizou documentos.

#### 2.4.5 Visualizacao de sessoes ativas (futuro)

- Model `PatientPortalSessionLog` para rastrear sessoes ativas (IP, user-agent, created, last_seen).
- Permite ao staff ver "ultima vez que o paciente acessou" e revogar sessoes.
- Fora do escopo inicial, mas prepara com o `passwordChangedAt` da 2.4.2.

#### 2.4.6 Exportacao de auditoria

- Para processos juridicos: endpoint `GET /api/v1/clients/[id]/audit-export` que gera PDF/CSV da timeline completa.
- Filtro por periodo e tipo de evento.
- Audit event: `AUDIT_EXPORT_GENERATED` (meta — auditar a propria exportacao).

#### 2.4.7 Hash de documentos para integridade

- Ao registrar `FileAsset`, calcular e armazenar `sha256Hash` do arquivo.
- Permite provar em processo juridico que o documento nao foi alterado apos upload.
- Campo novo em `FileAsset`: `sha256Hash String?`.

---

## 3. Ordem de implementacao sugerida

| Fase | Itens | Justificativa |
|------|-------|---------------|
| **Fase 1** | ~~2.2.1 (model senha) + 2.2.2 (validacao) + 2.2.3 (auto-cadastro)~~ **feito** | Fundacao — sem isso nada mais funciona |
| **Fase 2** | ~~2.2.4 (login com senha) + 2.2.5 (alterar senha) + 2.2.6 (esqueci senha)~~ **feito** | Completa o fluxo de autenticacao |
| **Fase 3** | ~~2.1.1 + 2.1.2 (novos audit events)~~ **feito** | Rastreabilidade completa |
| **Fase 4** | ~~2.3 (link facil)~~ **feito** (lista + hook; ficha: fluxo existente) | UX |
| **Fase 5** | ~~2.4.1 (rate limit) + 2.4.2 (invalidar sessao)~~ **feito** | Seguranca pos-senha |
| **Fase 6** | ~~2.1.3 (UI timeline melhorada) + 2.4.3 (LGPD consent)~~ **feito** | Compliance |
| **Fase 7** | ~~2.4.6 (export auditoria) + 2.4.7 (hash documentos)~~ **feito** | Juridico/pericial |

---

## 4. Arquivos-chave por fase

### Fase 1 — Model + validacao + auto-cadastro
```
packages/prisma/schema.prisma                                    → add portalPasswordHash
packages/prisma/migrations/YYYYMMDD_add_portal_password/         → migration
src/lib/validators/patient-portal-auth.ts                        → portalPasswordSchema (novo)
src/features/clients/app/pages/patient-self-register-page.tsx    → campos senha + confirm
src/shared/components/forms/password-strength-indicator.tsx      → componente visual (novo)
src/app/api/v1/public/patient-self-register/route.ts             → hash + salvar
src/lib/validators/patient-self-register.ts                      → add password ao schema
```

### Fase 2 — Login + alterar + esqueci senha
```
src/app/api/v1/public/patient-portal/[tenantSlug]/password/      → verify route (novo)
src/app/[locale]/(patient)/[tenantSlug]/patient/login/            → UI condicional senha/OTP
src/app/api/v1/patient/password/route.ts                          → alterar senha (novo)
src/features/patient-portal/app/pages/patient-portal-profile.tsx  → botao "alterar senha"
```

### Fase 3 — Audit events
```
packages/prisma/schema.prisma                                     → enum novos valores
src/infrastructure/audit/record-audit-event.ts                    → sem mudanca (generico)
~16 route handlers (listados em 2.1.2)                            → add recordAuditEvent
src/lib/clients/client-timeline.ts                                → renderizar novos tipos
src/features/clients/app/components/client-detail-timeline-section.tsx → labels/icones
```

### Fase 4 — Link facil
```
src/features/clients/app/components/clients-table-columns.tsx     → acao rapida na coluna
src/features/clients/app/components/client-detail-header.tsx      → botoes copiar/QR
src/features/clients/app/hooks/use-copy-portal-link.ts            → hook reutilizavel (novo)
```

---

## 5. Decisoes definidas

| # | Questao | Decisao |
|---|---------|---------|
| D1 | Senha obrigatoria ou opcional no auto-cadastro? | **Obrigatoria** — todo paciente que se auto-cadastra define senha. |
| D2 | Pacientes existentes (sem senha) — forcar definicao? | **Nao** — continua acessando via magic link/OTP normalmente. |
| D3 | Staff pode resetar senha do paciente? | **Sim** — staff solicita reset, paciente recebe link de redefinicao por e-mail. Gera audit event `PATIENT_PORTAL_PASSWORD_RESET_REQUESTED`. |
| D4 | Manter magic link como alternativa apos senha? | **Sim** — magic link continua funcionando mesmo que o paciente tenha senha. Util para suporte e onboarding. |
