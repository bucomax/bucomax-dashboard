# Refatoração — src/shared/

Plano de padronização da pasta `shared/` conforme regras de arquitetura do projeto.

Auditoria realizada em 2026-04-17. A pasta está bem organizada no geral — apenas 2 correções necessárias.

---

## 1. Dependência circular: shared → features (HIGH)

**Problema:** `src/shared/components/layout/app-shell.tsx` importa componentes de `@/features/notifications/`:

```typescript
import { NotificationBell } from "@/features/notifications/app/components/notification-bell";
import { NotificationPermissionBanner } from "@/features/notifications/app/components/notification-permission-banner";
```

A direção de dependência do projeto é `features → shared`, nunca o contrário. Esse import acopla o AppShell (infraestrutura de layout) a uma feature específica.

**Opções de correção:**

### Opção A — Slots via props (recomendada)

AppShell recebe os componentes como `children` ou props de slot:

```typescript
// app-shell.tsx
type AppShellProps = {
  children: ReactNode;
  headerSlots?: ReactNode; // NotificationBell, etc.
};
```

O `page.tsx` ou layout que usa AppShell passa os componentes:

```tsx
<AppShell headerSlots={<><NotificationBell /><NotificationPermissionBanner /></>}>
  {children}
</AppShell>
```

### Opção B — Mover componentes para shared

Se `NotificationBell` e `NotificationPermissionBanner` são genéricos o suficiente, mover para `src/shared/components/notifications/`. Só faz sentido se não dependem de lógica específica da feature notifications.

### Opção C — Componente wrapper no layout

Criar um componente `DashboardAppShell` em `src/app/` (camada de composição) que importa AppShell + NotificationBell e compõe os dois. O AppShell puro fica em shared sem imports de features.

---

## 2. Pasta `src/shared/lib/` órfã (MEDIUM)

**Problema:** Existe `src/shared/lib/utils.ts` contendo apenas a função `cn()` (clsx + twMerge). Porém o projeto inteiro importa `cn` de `@/lib/utils` (arquivo `src/lib/utils.ts`).

**Ação:** Verificar se `src/shared/lib/utils.ts` é importado em algum lugar. Se não, deletar a pasta `src/shared/lib/` inteira. Se sim, atualizar os imports para apontar para `@/lib/utils` e então deletar.

---

## Itens verificados sem problemas

| Item | Status |
|------|--------|
| Estrutura de pastas (ui, forms, layout, feedback, providers, hooks, services, stores, types, constants) | OK |
| Tipos inline em componentes | OK — prop types locais são aceitáveis |
| Helpers inline | OK — pequenos e específicos do componente |
| Date/time inline | OK — zero ocorrências, usa `src/lib/utils/date.ts` |
| Duplicação de lógica | OK — zero duplicatas |
| Exports de tipos de forms | OK — todos exportados corretamente |
| Providers | OK — SessionProvider, ThemeProvider, bridges |
| Stores | OK — Zustand com persistência |

---

## Ordem de execução

1. **Resolver dependência circular AppShell → notifications** (opção A ou C)
2. **Remover `src/shared/lib/`** se confirmado órfão
