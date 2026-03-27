"use client";

import { LocaleSwitcher } from "@/shared/components/layout/locale-switcher";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Separator } from "@/shared/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/shared/components/ui/sidebar";
import { AppSidebar } from "@/shared/components/layout/app-sidebar";
import { TenantSwitcher } from "@/shared/components/layout/tenant-switcher";
import { ThemeToggle } from "@/shared/components/layout/theme-toggle";
import type { AppShellUser } from "@/shared/types/layout";
import { routing } from "@/i18n/routing";
import { ChevronDown, LogOut, Shield } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
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
  const isSuper = user.globalRole === "super_admin";
  const t = useTranslations("dashboard.shell");
  const locale = useLocale();
  const loginCallback =
    locale === routing.defaultLocale ? "/login" : `/${locale}/login`;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-background sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-3 md:px-4">
          <SidebarTrigger className="-ml-1" />
          {isSuper ? (
            <div className="bg-amber-500/15 text-amber-900 dark:text-amber-100 hidden max-w-[min(100%,28rem)] truncate rounded-md px-2 py-1 text-xs md:inline">
              <Shield className="mr-1 inline size-3.5 align-text-bottom" />
              {t("superAdminBanner")}
            </div>
          ) : null}
          <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
            <TenantSwitcher activeTenantId={user.tenantId} />
            <Separator orientation="vertical" className="hidden h-6 sm:block" />
            <LocaleSwitcher />
            <Separator orientation="vertical" className="hidden h-6 sm:block" />
            <ThemeToggle />
            <Separator orientation="vertical" className="hidden h-6 sm:block" />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="sm" className="max-w-[10rem] gap-1 px-2">
                    <span className="truncate text-sm">
                      {user.name?.trim() || user.email || t("account")}
                    </span>
                    <ChevronDown className="size-4 shrink-0 opacity-60" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-[12rem]">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{user.email}</span>
                    <span className="text-muted-foreground text-xs">
                      {user.globalRole}
                      {user.tenantRole ? ` · ${user.tenantRole}` : ""}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut({ callbackUrl: loginCallback })}>
                  <LogOut className="size-4" />
                  {t("signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex min-h-[calc(100svh-3.5rem)] flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
