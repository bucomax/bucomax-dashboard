"use client";

import { NotificationBell } from "@/features/notifications/app/components/notification-bell";
import { DashboardBreadcrumb } from "@/shared/components/layout/dashboard-breadcrumb";
import { LocaleSwitcher } from "@/shared/components/layout/locale-switcher";
import { Separator } from "@/shared/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/shared/components/ui/sidebar";
import { AppSidebar } from "@/shared/components/layout/app-sidebar";
import { TenantSwitcher } from "@/shared/components/layout/tenant-switcher";
import { ThemeToggle } from "@/shared/components/layout/theme-toggle";
import type { AppShellUser } from "@/shared/types/layout";
import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  user: AppShellUser;
};

/**
 * Shell do aplicativo autenticado: sidebar, barra superior, área de conteúdo.
 * Componente compartilhado — não pertence a uma feature de domínio.
 */
const headerToolbarSeparatorClass = "hidden h-10 sm:block";

export function AppShell({ children, user }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="bg-background sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-3 md:px-4">
          <SidebarTrigger className="-ml-1" />
          <DashboardBreadcrumb />
          <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
            <TenantSwitcher activeTenantId={user.tenantId} />
            <Separator orientation="vertical" className={headerToolbarSeparatorClass} />
            <NotificationBell />
            <Separator orientation="vertical" className={headerToolbarSeparatorClass} />
            <LocaleSwitcher />
            <Separator orientation="vertical" className={headerToolbarSeparatorClass} />
            <ThemeToggle />
          </div>
        </header>
        <div className="bg-muted/40 flex min-h-[calc(100svh-3.5rem)] flex-1 flex-col gap-4 p-4 md:p-6 dark:bg-muted/25">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
