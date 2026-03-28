# Página: Detalhe do paciente

## Origem dos mocks

| Arquivo | Diferença |
|---------|-----------|
| [`paciente.html`](../../../arquivos-interfaces/paciente.html) | Layout em duas colunas: timeline + checklist + documentos à esquerda; atividades, notas, ações rápidas à direita. Dados via `localStorage` mock. |
| [`interface-paciente-detalhe.html`](../../../arquivos-interfaces/interface-paciente-detalhe.html) | Variante: timeline mais rica com checklist embutido por fase; sidebar com ações, contato, documentos, histórico; modal “Confirmar avanço” com lista de PDFs. |

**Recomendação de migração:** uma **única rota** no app que una o melhor dos dois: cabeçalho com ações (avançar, WhatsApp, editar), **timeline** com estado por etapa, **checklist da etapa atual**, **documentos**, **feed de atividades**, **notas**, **modal de transição** com pacote de documentos.

---

## Rota sugerida

- `/[locale]/clients/[clientId]` (dynamic segment)
- Breadcrumb: Clients → Nome

---

## Blocos de UI consolidados

| Bloco | Descrição | Componentes |
|-------|-----------|-------------|
| Header do paciente | Avatar/iniciais, nome, “desde”, badges fluxo / OPME / status, botões Avançar fase, Mensagem (WA), Editar | `Card`, `Badge`, `Button`, `Avatar` |
| Grid contato | WhatsApp, e-mail, fase atual, tempo na fase | ícones Lucide + texto |
| Timeline | Todas as etapas ordenadas; completed / current / pending | lista vertical custom ou stepper |
| Checklist fase atual | Itens marcáveis com progresso N/M | checkboxes + mutation |
| Documentos enviados | Lista nome, data, status enviado/pendente/visualizado | `Table` ou lista; link presign R2 quando existir |
| Atividades recentes | Linha do tempo de eventos | lista a partir de `StageTransition` + futuros eventos |
| Anotações | Textarea + Salvar | `Textarea`, `Button`; persistência gap ou `caseDescription` |
| Ações rápidas | Agendar, solicitar exames, lembrete, histórico | botões → modais ou rotas futuras |
| Modal avanço | Lista de PDFs que serão enviados + confirmar | `Dialog`; dados de `StageDocument`/dispatch |

---

## Dados exibidos

| Dado | Origem |
|------|--------|
| Identidade | `Client` |
| Jornada | `PatientPathway` + `PathwayVersion` + `CarePathway` |
| Etapa atual | `PathwayStage` |
| Histórico de mudanças | `StageTransition` (+ `User` actor) |
| Documentos | `FileAsset` + **StageDocument**/dispatch quando existir |
| Checklist | **Gap:** templates por etapa + progresso por paciente |
| Dias na fase | **Gap:** `enteredStageAt` |
| Responsável | **Gap:** `Client.assignedToUserId` |

---

## Backend

### Tabelas / models

- `Client`, `PatientPathway`, `PathwayStage`, `PathwayVersion`, `CarePathway`
- `StageTransition` (histórico)
- `User` (ator)
- `FileAsset` (arquivos)
- Futuro: checklist, notes, dispatch status

### Endpoints sugeridos

| Ação | Endpoint |
|------|----------|
| Detalhe completo | `GET /api/v1/clients/:id` ou `GET /api/v1/patient-pathways/by-client/:clientId` com includes profundos |
| Transição | `POST /api/v1/patient-pathways/:id/transition` com `toStageId`, `note?` |
| Checklist toggle | `PATCH .../checklist-items/:itemId` (quando schema existir) |
| Salvar nota | `PATCH /api/v1/clients/:id` (campo notes) ou recurso dedicado |
| Preview docs da etapa destino | `GET .../stages/:stageId/documents` ou embutido na resposta de transição candidata |

### Checklist backend

- [ ] GET detalhe com tenant guard e sem vazar dados de outros tenants
- [ ] Transição reutilizando use case único
- [ ] Lista de transições ordenada `createdAt desc`
- [ ] Extensões de schema conforme checklist/notas/SLA forem priorizadas

---

## Frontend

### Rotas / arquivos

- `src/app/[locale]/(dashboard)/clients/[clientId]/page.tsx`
- Componentes em `src/features/clients/...` ou `features/patient-pathway/...`

### Navegação

- Lista → detalhe; dashboard Kanban → detalhe; alertas → detalhe

### Checklist frontend

- [ ] Estados loading / 404 / erro
- [ ] Timeline derivada de estágios da versão do paciente + `currentStageId`
- [ ] Modal de confirmação antes de transição (quando houver dispatch)
- [ ] Link WhatsApp: `https://wa.me/` + telefone normalizado (só UI; sem logar PII indevido)
- [ ] i18n

---

## Documentação relacionada

- [page-patients-list.md](./page-patients-list.md)
- [../persistence-api-and-transitions.md](../persistence-api-and-transitions.md)
- Skill/projeto: transição de etapa e bundle de documentos (regras de domínio)
