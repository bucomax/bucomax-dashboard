"use client";

import {
  listTenantMembers,
  patchMemberRole,
  removeTenantMember,
} from "@/features/account/app/services/members.service";
import type { TenantMemberRow } from "@/features/account/app/types/api";
import { toast } from "@/lib/toast";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Loader2, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

export function TenantMembersCard() {
  const t = useTranslations("account.members");
  const { data: session, status } = useSession();
  const tenantId = session?.user?.tenantId ?? null;
  const tenantRole = session?.user?.tenantRole ?? null;
  const globalRole = session?.user?.globalRole ?? null;
  const currentUserId = session?.user?.id ?? null;

  const canManage = Boolean(
    tenantId && (tenantRole === "tenant_admin" || globalRole === "super_admin"),
  );

  const [rows, setRows] = useState<TenantMemberRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantId || !canManage) return;
    setError(null);
    try {
      const list = await listTenantMembers(tenantId);
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setRows([]);
    }
  }, [tenantId, canManage, t]);

  useEffect(() => {
    if (status !== "authenticated" || !canManage || !tenantId) {
      return;
    }
    void load();
  }, [status, canManage, tenantId, load]);

  const sorted = useMemo(() => {
    if (!rows) return [];
    return [...rows].sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
  }, [rows]);

  async function handleRoleChange(member: TenantMemberRow, value: string) {
    if (!tenantId) return;
    const newRole = value === "tenant_admin" ? "tenant_admin" : "tenant_user";
    if (member.role === newRole) return;
    setBusyId(member.userId);
    try {
      await patchMemberRole(tenantId, member.userId, newRole);
      toast.success(t("roleUpdated"));
      setRows((prev) =>
        (prev ?? []).map((m) => (m.userId === member.userId ? { ...m, role: newRole } : m)),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("loadError"));
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(member: TenantMemberRow) {
    if (!tenantId) return;
    if (!window.confirm(t("removeConfirm"))) return;
    setBusyId(member.userId);
    try {
      await removeTenantMember(tenantId, member.userId);
      toast.success(t("memberRemoved"));
      setRows((prev) => (prev ?? []).filter((m) => m.userId !== member.userId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("loadError"));
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (status === "loading" || !session) {
    return null;
  }

  if (!canManage || !tenantId) {
    return null;
  }

  if (rows === null && !error) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-destructive text-sm">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            {t("retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {!sorted.length ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : (
          <div className="divide-border rounded-xl border">
            <div className="text-muted-foreground grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b px-3 py-2 text-xs font-medium sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto]">
              <span>{t("columns.member")}</span>
              <span className="hidden sm:inline">{t("columns.email")}</span>
              <span className="text-center sm:text-left">{t("columns.role")}</span>
              <span className="w-10 text-right sm:w-12" />
            </div>
            <ul className="divide-y">
              {sorted.map((m) => {
                const isSelf = currentUserId === m.userId;
                const busy = busyId === m.userId;
                return (
                  <li
                    key={m.userId}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-3 text-sm sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto]"
                  >
                    <div className="min-w-0">
                      <span className="font-medium">{m.name?.trim() || m.email}</span>
                      {isSelf ? (
                        <span className="text-muted-foreground ml-2 text-xs">({t("you")})</span>
                      ) : null}
                      <div className="text-muted-foreground truncate text-xs sm:hidden">{m.email}</div>
                    </div>
                    <span className="text-muted-foreground hidden truncate sm:inline">{m.email}</span>
                    <Select
                      value={m.role === "tenant_admin" ? "tenant_admin" : "tenant_user"}
                      onValueChange={(v) => {
                        if (v) void handleRoleChange(m, v);
                      }}
                      disabled={busy}
                    >
                      <SelectTrigger className="h-9 w-[140px] sm:w-[160px]" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tenant_admin">{t("roleAdmin")}</SelectItem>
                        <SelectItem value="tenant_user">{t("roleUser")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        disabled={busy}
                        onClick={() => void handleRemove(m)}
                        aria-label={t("remove")}
                      >
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
