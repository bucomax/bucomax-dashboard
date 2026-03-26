---
name: docs-alignment
description: Mantém a documentação do repositório alinhada ao código e ao produto. Use quando alterar modelo de dados, fluxos de jornada, APIs públicas, integrações ou RBAC; ou quando o usuário pedir para atualizar README, ARCHITECTURE ou PRODUCT-SCOPE.
---

# Alinhamento da documentação

## Arquivos

| Arquivo | Quando atualizar |
|---------|------------------|
| `docs/ARCHITECTURE.md` | Novas tabelas Prisma, rotas `/api/v1`, mudança em §8, auth, subdomínios |
| `public/openapi.json` | Toda alteração de contrato em `/api/v1` (paths, schemas, security) para Scalar ficar correto |
| `docs/PRODUCT-SCOPE.md` | Regra de negócio visível ao usuário (jornada, documentos por etapa, fases) |
| `README.md` | Stack, links de docs, como rodar o projeto (após existir código) |
| `docs/DEV-PHASES.md` | Reordenar ou marcar fases concluídas quando mudar o plano de implementação |

## Regras

- Não criar documentos `.md` novos sem necessidade; preferir **editar** os existentes.
- Se renomear entidades (`CarePathway`, etc.), atualizar **§8** e menções no `PRODUCT-SCOPE`.
- Commits que mudam contrato de integração devem citar a seção da doc atualizada.
