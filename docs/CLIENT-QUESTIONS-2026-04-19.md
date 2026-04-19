# Perguntas para o Cliente — 19/04/2026

Referente ao feedback de melhorias recebido. Organizamos por tema para facilitar as respostas.

---

## B — Operacional

### 1. Próxima ação recomendada (ref. B.1)

Você mencionou que o sistema deveria sugerir a "próxima ação recomendada" baseada na etapa e no contexto do paciente.

- O que você considera "contexto"? Exemplos: tipo de cirurgia, complexidade, tempo na etapa, documentos pendentes, resposta do paciente?
- Pode dar 2-3 exemplos concretos de como essa sugestão apareceria na tela?

---

### 2. Motor de regras — automação de decisões (ref. B.2)

Você pediu um motor de regras tipo "se… então…" para automatizar decisões, alertas e ações.

- Pode dar 3-5 exemplos de regras reais que usaria no dia a dia? Ex.: "se checklist completo → avançar etapa", "se SLA vencido → notificar gestor".
- Você quer criar essas regras pela interface (tipo arrastar blocos) ou seriam regras fixas que nós configuramos?
- As regras envolvem só dados do sistema (etapa, checklist, SLA) ou também dados externos (resultado de exame, resposta do paciente pelo WhatsApp)?

---

### 3. Responsáveis por etapa (ref. B.4)

Você pediu responsáveis obrigatórios por etapa, com fallback automático e fila de responsabilidade.

- O responsável é sempre o médico titular ou pode ser outro profissional (enfermeiro, secretária)?
- A responsabilidade muda por etapa? Ex.: pré-op é da secretária, cirurgia é do médico, pós-op é do enfermeiro?
- "Fallback automático" significa: se o responsável não agir em X horas, passa para quem? Um backup específico ou qualquer um disponível?
- "Fila de responsabilidade" seria uma ordem de prioridade? Ex.: 1º Dr. João → 2º Dra. Maria → 3º Coordenação?

---

### 4. Documentos por etapa (ref. B.5)

Você pediu templates de documentos com geração automática, envio ao paciente e controle de versão.

- Quais tipos de documentos gostaria de gerar automaticamente? Ex.: termo de consentimento, pedido de exames, relatório cirúrgico, atestado?
- Os templates teriam variáveis preenchidas com dados do paciente (nome, CPF, procedimento, data da cirurgia)?
- "Controle de versão" significa manter histórico de alterações no mesmo documento ou versões diferentes de um template?
- "Envio ao paciente" seria por WhatsApp, e-mail ou portal do paciente?

---

### 5. Bloco de "próximas ações" (ref. B.9)

Você pediu um bloco de "próximas ações" para guiar o usuário operacionalmente.

- Isso é diferente da "próxima ação recomendada" (pergunta 1)?
- Seria uma lista tipo to-do do profissional? Ex.: "3 pacientes aguardando confirmação de exame", "2 checklists pendentes", "1 SLA crítico"?
- Apareceria no dashboard geral ou dentro da ficha de cada paciente?

---

## C — Prontuário Clínico

### 6. Modelo de anamnese

- Qual modelo de anamnese você usa hoje? É um formulário padrão da bucomaxilofacial ou cada médico tem o seu?
- Pode enviar um modelo em branco (ou preenchido de exemplo) para entendermos os campos necessários?

---

### 7. Evolução clínica

- A evolução clínica seria texto livre ou campos estruturados?
- Você usa o formato SOAP (Subjetivo, Objetivo, Avaliação, Plano) ou outro formato?

---

### 8. Assinatura digital

- Os registros do prontuário precisam de assinatura digital (CRM/CRO)?
- Você já usa certificado digital ICP-Brasil ou gostaria de implementar?

Obs.: isso impacta significativamente a complexidade e o prazo de entrega.

---

### 9. Regulatório

- O prontuário precisa atender alguma resolução específica? Ex.: CFM 1.638/2002 (prontuário médico) ou CFO 118/2012 (prontuário odontológico)?
- Existe algum requisito de tempo mínimo de retenção dos dados clínicos?

---

### 10. Funcionalidades de IA

- **Transcrição de consultas:** você gravaria o áudio da consulta pelo próprio sistema ou enviaria um arquivo de áudio gravado externamente?
- **Geração automática de documentos:** quais documentos são prioridade? Relatório cirúrgico? Laudo? Atestado? Pedido de exames?
- **Busca inteligente:** que tipo de busca você precisa? Ex.: "pacientes com fratura de mandíbula bilateral", "pacientes que tomam anticoagulante"?

---

### 11. Escopo clínico

- O prontuário precisa cobrir só bucomaxilofacial ou também outras especialidades (ortodontia, implantodontia)?
- Isso afeta os campos da anamnese e do planejamento de tratamento.

---

### 12. Integração com sistemas externos

- Você usa algum sistema de imagens (PACS/DICOM) ou laboratório?
- Gostaria de receber laudos de exame automaticamente no sistema?

---

### 13. Prioridade de entrega do prontuário

Se pudéssemos entregar o prontuário em fases, qual ordem de prioridade você daria?

- (a) Anamnese + evolução clínica
- (b) Exames e imagens
- (c) Funcionalidades de IA
- (d) Integração com a jornada do paciente

---

*Aguardamos as respostas para seguir com o planejamento técnico e estimativas de prazo.*
