"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/shared/components/ui/sidebar";
import type { AppShellUser } from "@/shared/types/layout";
import {
  ChevronDown,
  ClipboardList,
  FolderOpen,
  GitBranch,
  Home,
  LogOut,
  Settings,
  Stethoscope,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { signOut } from "next-auth/react";

type NavItem = {
  href: string;
  labelKey: "home" | "clients" | "pathways" | "attendance" | "files" | "accountPage" | "settings";
  icon: LucideIcon;
  match: (p: string) => boolean;
};

const navGroups: { labelKey: "principal" | "operacao" | "conta"; items: NavItem[] }[] = [
  {
    labelKey: "principal",
    items: [
      {
        href: "/dashboard",
        labelKey: "home",
        icon: Home,
        match: (p) => p === "/dashboard" || p === "/dashboard/",
      },
      {
        href: "/dashboard/clients",
        labelKey: "clients",
        icon: Users,
        match: (p) => p.startsWith("/dashboard/clients"),
      },
      {
        href: "/dashboard/pathways",
        labelKey: "pathways",
        icon: GitBranch,
        match: (p) => p.startsWith("/dashboard/pathways"),
      },
    ],
  },
  {
    labelKey: "operacao",
    items: [
      {
        href: "/dashboard/attendance",
        labelKey: "attendance",
        icon: ClipboardList,
        match: (p) => p.startsWith("/dashboard/attendance"),
      },
      {
        href: "/dashboard/files",
        labelKey: "files",
        icon: FolderOpen,
        match: (p) => p.startsWith("/dashboard/files"),
      },
    ],
  },
  {
    labelKey: "conta",
    items: [
      {
        href: "/dashboard/account",
        labelKey: "accountPage",
        icon: UserCircle,
        match: (p) => p.startsWith("/dashboard/account"),
      },
      {
        href: "/dashboard/settings",
        labelKey: "settings",
        icon: Settings,
        match: (p) => p.startsWith("/dashboard/settings"),
      },
    ],
  },
];

type AppSidebarProps = {
  user: AppShellUser;
};

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("dashboard");
  const tBrand = useTranslations("global");
  const tShell = useTranslations("dashboard.shell");
  const locale = useLocale();
  const loginCallback = locale === routing.defaultLocale ? "/login" : `/${locale}/login`;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-sidebar-border border-b">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold outline-none ring-sidebar-ring focus-visible:ring-2"
        >
          <Stethoscope className="size-5 shrink-0 text-sidebar-primary" />
          <span className="group-data-[collapsible=icon]:hidden">{tBrand("brand")}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.labelKey}>
            <SidebarGroupLabel>{t(`nav.${group.labelKey}`)}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const label = t(`nav.${item.labelKey}`);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        tooltip={label}
                        isActive={item.match(pathname)}
                        render={<Link href={item.href} />}
                      >
                        <item.icon />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-2 group-data-[collapsible=icon]:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="sm" className="h-auto w-full justify-between gap-2 px-2 py-2">
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-medium">{user.name?.trim() || tShell("account")}</p>
                  <p className="text-muted-foreground truncate text-xs">{user.email}</p>
                </div>
                <ChevronDown className="text-muted-foreground size-4 shrink-0" />
              </Button>
            }
          />
          <DropdownMenuContent side="top" align="start" className="min-w-[14rem]">
            <DropdownMenuItem onClick={() => void signOut({ callbackUrl: loginCallback })}>
              <LogOut className="size-4" />
              {tShell("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
