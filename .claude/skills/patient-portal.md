# Skill: patient-portal

Portal do paciente — autenticação por CPF/OTP, visualização de jornada, upload/review de arquivos.

**Usar quando:** portal do paciente, magic link, OTP, CPF login, self-register, file review, patient-facing pages.

## Arquitetura do portal

- Feature: `src/features/patient-portal/`.
- Rotas protegidas: `src/app/api/v1/patient/*` — autenticadas via token JWT do portal (não NextAuth session).
- Rotas públicas: `src/app/api/v1/public/patient-portal/[tenantSlug]/*`.
- Client HTTP: `src/lib/api/patient-portal-client.ts`.

## Fluxo de autenticação

1. **Magic link** — `PatientPortalLinkToken` enviado por WhatsApp/email.
   - Token exchange: `POST /api/v1/public/patient-portal/[tenantSlug]/exchange`.
   - `singleUse` flag controla se token pode ser reutilizado.
2. **OTP (CPF)** — paciente informa CPF, recebe OTP por WhatsApp.
   - Request: `POST /api/v1/public/patient-portal/[tenantSlug]/otp/request`.
   - Verify: `POST /api/v1/public/patient-portal/[tenantSlug]/otp/verify`.
   - `PatientPortalOtpChallenge` armazena hash do OTP.
3. **Self-register** — convite via QR/link.
   - `PatientSelfRegisterInvite` → `POST /api/v1/public/patient-self-register`.

## Segurança

- Respostas opacas (`jsonSuccessOpaque`) para não vazar existência de dados.
- Rate limit por IP (preset `auth`).
- OTP hash com bcrypt; TTL curto.
- Token JWT do portal com escopo limitado (clientId, tenantId).

## Funcionalidades do paciente autenticado

- `GET /api/v1/patient/overview` — resumo da jornada, etapa atual.
- `GET /api/v1/patient/detail` — dados pessoais.
- `PATCH /api/v1/patient/profile` — atualizar dados (CPF normalizado, telefone).
- `GET /api/v1/patient/timeline` — timeline de eventos.
- `GET /api/v1/patient/files` — arquivos do paciente.
- `POST /api/v1/patient/files/presign` — upload de arquivo.
- `POST /api/v1/patient/files/presign-download` — download com URL assinada.
- `POST /api/v1/patient/logout` — encerrar sessão do portal.

## File review

- `PatientPortalFileReviewStatus`: `pending_review` | `approved` | `rejected`.
- Staff review: `PATCH /api/v1/clients/[clientId]/files/[fileId]/review`.
- Upload do paciente cria `FileAsset` com status `pending_review`.

## Tipos

- DTOs: `src/types/api/patient-portal-v1.ts`.
- Validators: `src/lib/validators/patient-portal.ts`, `src/lib/validators/patient-portal-files.ts`, `src/lib/validators/patient-portal-profile.ts`.
