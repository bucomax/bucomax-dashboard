# Bucomax — lógica de negócio consolidada

Este documento resume a **regra de negócio efetiva** que hoje governa cadastro de pacientes, jornada clínica, documentos por etapa e responsabilidades no tenant. Ele complementa `ARCHITECTURE.md` (§8), `execution-plan.md` e `persistence-api-and-transitions.md`.

---

## 1. Princípios transversais

- Todo dado clínico/cadastral é **escopado por `tenantId`**.
- Toda operação de negócio protegida usa **tenant ativo** e deve aceitar apenas usuário com **membership válida** no tenant, exceto `super_admin` em contexto explícito.
- O backend é a fonte de verdade: UI pode orientar, mas não decide permissão nem integridade de fluxo.
- Arquivos clínicos ficam em `FileAsset` (R2) e downloads usam **URL assinada de curta duração**.

---

## 2. Paciente (`Client`)

### Campos operacionais atuais

- Obrigatórios no cadastro:
  - `name`
  - `phone`
  - `documentId`
- Opcionais:
  - `email`
  - `caseDescription`
  - `assignedToUserId`
  - `opmeSupplierId`

### Regras

- `assignedToUserId` só pode apontar para usuário com **`TenantMembership` ativa** no mesmo tenant.
- `opmeSupplierId` só pode apontar para `OpmeSupplier` **ativa** do mesmo tenant.
- `deletedAt != null` significa **soft delete**; listagens e detalhes não devem exibir esse paciente.

---

## 3. Jornada do paciente (`PatientPathway`)

### Entrada na jornada

1. O paciente é criado no tenant.
2. O usuário escolhe uma `CarePathway` publicada.
3. O backend resolve a **versão publicada mais recente**.
4. O paciente entra na **primeira etapa** (`sortOrder` ascendente).
5. O sistema grava:
   - `PatientPathway`
   - `StageTransition` inicial (`fromStageId = null`)
   - `dispatchStub` com snapshot do pacote de documentos da etapa inicial

### Regras

- Um `Client` só pode ter **uma** `PatientPathway` ativa no modelo atual.
- A jornada sempre aponta para uma **`PathwayVersion` publicada**.
- `enteredStageAt` é atualizado sempre que a etapa atual muda.

---

## 4. Transição de etapa

### Regra atual

- `toStageId` deve pertencer ao mesmo `pathwayVersionId` do paciente.
- Não é permitido transicionar para a **mesma** etapa atual.
- A transição é salva em transação com:
  - `StageTransition`
  - atualização de `PatientPathway.currentStageId`
  - atualização de `enteredStageAt`

### Pacote de documentos

- Cada `PathwayStage` pode ter vários `StageDocument`.
- `StageDocument` referencia `FileAsset` e possui `sortOrder`.
- Ao iniciar jornada ou mudar de etapa, o backend monta o bundle ordenado de documentos da etapa de destino e o salva em `dispatchStub.documents`.

### Observações atuais

- O snapshot hoje serve para **auditoria e preview**, não para envio real ao WhatsApp.
- Ainda não existe `ChannelDispatch` persistido nem integração real de canal nesta fatia.

---

## 5. Documentos

### `FileAsset`

- Representa metadados de arquivo já enviado ao R2.
- Pode estar vinculado diretamente a um paciente (`clientId`) para histórico/consulta.

### `StageDocument`

- Representa arquivo do **pacote de uma etapa**.
- Regras:
  - só pode referenciar etapa **publicada** do tenant
  - só pode referenciar `FileAsset` do mesmo tenant
  - o mesmo arquivo não pode ser associado duas vezes à mesma etapa (`@@unique([pathwayStageId, fileAssetId])`)

---

## 5.1 Checklist por etapa

- `PathwayStageChecklistItem` materializa os itens operacionais configurados na etapa publicada.
- A fonte de verdade de edição fica no `graphJson` da jornada em rascunho; ao publicar, os itens são sincronizados para a etapa materializada.
- `PatientPathwayChecklistItem` guarda o progresso por paciente.
- Regras atuais:
  - o toggle só pode ocorrer para item da **etapa atual** do paciente
  - o item precisa pertencer à mesma `PathwayVersion` da jornada do paciente
  - desmarcar limpa `completedAt` e `completedByUserId`

---

## 6. Responsável e OPME

### Responsável

- É um vínculo leve entre `Client` e `User`.
- Serve para organização operacional, não altera permissão clínica por si só.

### Fornecedor OPME

- `OpmeSupplier` é catálogo por tenant.
- Pode ser criado por `tenant_admin` ou `super_admin`.
- O paciente referencia no máximo um fornecedor OPME atual.

---

## 6.1 Notas dedicadas

- `PatientNote` guarda anotações clínicas/operacionais separadas de `caseDescription`.
- `caseDescription` continua sendo o **resumo** do caso; `PatientNote` vira o **histórico cronológico**.
- Regras atuais:
  - toda nota pertence a um `tenantId` e a um `clientId`
  - toda nota registra `authorUserId`
  - a listagem é paginada e ordenada por `createdAt desc`

---

## 7. SLA e listagens

- SLA do paciente é derivado de:
  - `enteredStageAt`
  - `alertWarningDays`
  - `alertCriticalDays`
- Quando o filtro por status SLA está ativo, o backend percorre os pacientes em lotes para retornar:
  - página correta
  - `totalItems` correto
  - `hasNextPage` correto

---

## 8. Decisões de produto já assumidas no código

- A ficha do paciente concentra:
  - descrição do caso
  - anotações dedicadas
  - checklist da etapa atual
  - arquivos do paciente
  - contato/gestão (e-mail, responsável, OPME)
  - timeline
  - transição com preview do pacote documental
- O modal de transição mostra o **pacote completo da etapa de destino**, não só observação textual.
- A busca da lista de pacientes considera **nome, telefone e e-mail**.

---

## 9. Gaps ainda em aberto

- `ChannelDispatch` real com status/erro/retry.
- Decisão formal se a transição pode ir para **qualquer etapa da versão** ou apenas etapas adjacentes no fluxo.
- Regras de migração de pacientes entre versões publicadas.

---

## 10. Referências

- `docs/ARCHITECTURE.md`
- `docs/PRODUCT-SCOPE.md`
- `docs/bucomax/execution-plan.md`
- `docs/bucomax/persistence-api-and-transitions.md`
