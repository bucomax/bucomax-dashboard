"use client";

import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { toast } from "@/lib/toast";
import { listTenants, setActiveTenant } from "@/shared/services/tenant.service";
import type { TenantListItem } from "@/shared/types/tenant";
import { Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type TenantSwitcherProps = {
  activeTenantId: string | null | undefined;
};

export function TenantSwitcher({ activeTenantId }: TenantSwitcherProps) {
  const { update } = useSession();
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantListItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await listTenants();
      setTenants(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar tenants";
      setLoadError(msg);
      setTenants([]);
      toast.error(msg);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const current = tenants?.find((t) => t.id === activeTenantId) ?? null;
  const label = current?.name ?? (activeTenantId ? "Tenant selecionado" : "Sem tenant");

  async function onSelect(tenantId: string) {
    if (tenantId === activeTenantId) return;
    setPendingId(tenantId);
    try {
      await setActiveTenant(tenantId);
      await update();
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao trocar tenant";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setPendingId(null);
    }
  }

  if (tenants && tenants.length === 0 && !loadError) {
    return (
      <span className="text-muted-foreground hidden max-w-[12rem] truncate text-sm sm:inline">
        Nenhum tenant
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="max-w-[14rem] justify-between gap-1 px-2"
            disabled={!!pendingId || tenants === null}
          >
            {pendingId !== null ? (
              <Loader2 className="size-4 shrink-0 animate-spin" />
            ) : (
              <Building2 className="size-4 shrink-0" />
            )}
            <span className="truncate">{tenants === null ? "…" : label}</span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <DropdownMenuContent className="min-w-[14rem]" align="end">
        <DropdownMenuLabel>Clínica / tenant</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loadError ? (
          <div className="text-destructive px-2 py-1.5 text-sm">{loadError}</div>
        ) : null}
        {tenants?.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => void onSelect(t.id)}
            disabled={!!pendingId}
          >
            <span className="flex flex-1 flex-col gap-0.5 truncate text-left">
              <span className="truncate font-medium">{t.name}</span>
              <span className="text-muted-foreground text-xs">{t.slug}</span>
            </span>
            {t.id === activeTenantId ? (
              <Check className="text-primary ml-2 size-4 shrink-0" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
