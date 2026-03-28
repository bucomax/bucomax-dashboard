"use client";

import { LocaleSwitcher } from "@/shared/components/layout/locale-switcher";
import { Separator } from "@/shared/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/shared/components/ui/sidebar";
import { AppSidebar } from "@/shared/components/layout/app-sidebar";
import { TenantSwitcher } from "@/shared/components/layout/tenant-switcher";
import { ThemeToggle } from "@/shared/components/layout/theme-toggle";
import type { AppShellUser } from "@/shared/types/layout";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  user: AppShellUser;
};

/**
 * Shell do aplicativo autenticado: sidebar, barra superior, área de conteúdo.
 * Componente compartilhado — não pertence a uma feature de domínio.
 */
export function AppShell({ children, user }: AppShellProps) {
  const tNav = useTranslations("dashboard.nav");
  const pathname = usePathname();
  const breadcrumb = pathname
    .replace(/^\/dashboard\/?/, "")
    .split("/")
    .filter(Boolean)
    .slice(0, 2);

  const breadcrumbLabels = breadcrumb.map((segment) => {
    if (segment === "clients") return tNav("clients");
    if (segment === "pathways") return tNav("pathways");
    if (segment === "patient-pathways") return tNav("pathways");
    if (segment === "attendance") return tNav("attendance");
    if (segment === "files") return tNav("files");
    if (segment === "account") return tNav("accountPage");
    if (segment === "settings") return tNav("settings");
    if (segment === "new") return "Novo";
    return segment;
  });

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="bg-background sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-3 md:px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="text-muted-foreground hidden items-center gap-1 text-xs sm:flex">
            <span>{tNav("home")}</span>
            {breadcrumbLabels.map((label, index) => (
              <span key={`${label}-${index}`} className="inline-flex items-center gap-1">
                <span>/</span>
                <span className="text-foreground">{label}</span>
              </span>
            ))}
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
            <TenantSwitcher activeTenantId={user.tenantId} />
            <Separator orientation="vertical" className="hidden h-6 sm:block" />
            <LocaleSwitcher />
            <Separator orientation="vertical" className="hidden h-6 sm:block" />
            <ThemeToggle />
          </div>
        </header>
        <div className="flex min-h-[calc(100svh-3.5rem)] flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
