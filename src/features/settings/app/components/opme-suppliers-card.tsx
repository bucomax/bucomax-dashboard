"use client";

import { useOpmeSuppliers } from "@/features/settings/app/hooks/use-opme-suppliers";
import { toast } from "@/lib/toast";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { ChevronLeft, ChevronRight, Loader2, Plus, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function OpmeSuppliersCard() {
  const t = useTranslations("settings.opme");
  const [newName, setNewName] = useState("");
  const {
    sessionStatus,
    canCreate,
    query,
    setQuery,
    setPage,
    rows,
    loading,
    error,
    pagination,
    rangeLabel,
    creating,
    reload,
    createSupplier,
  } = useOpmeSuppliers();

  async function handleCreate() {
    try {
      await createSupplier(newName);
      setNewName("");
      toast.success(t("created"));
    } catch {
      /* erro: toast global no apiClient */
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="max-w-md"
          />
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void reload()} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {t("refresh")}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("createPlaceholder")}
            className="max-w-md"
            disabled={creating || sessionStatus === "loading" || !canCreate}
          />
          <Button
            type="button"
            size="sm"
            onClick={() => void handleCreate()}
            disabled={creating || sessionStatus === "loading" || !canCreate || !newName.trim()}
          >
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {t("create")}
          </Button>
        </div>
        {!canCreate && sessionStatus !== "loading" ? (
          <p className="text-muted-foreground text-sm">{t("createForbidden")}</p>
        ) : null}

        {error ? (
          <div className="border-destructive/40 bg-destructive/5 rounded-lg border p-3">
            <p className="text-destructive text-sm">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void reload()}
            >
              <RefreshCw className="size-4" />
              {t("retry")}
            </Button>
          </div>
        ) : null}

        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-muted/40 rounded-lg border p-4">
                <div className="bg-muted h-4 w-40 rounded" />
                <div className="bg-muted mt-3 h-3 w-28 rounded" />
              </div>
            ))
          ) : rows.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm">
              {t("empty")}
            </div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="flex flex-col gap-2 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {t(row.active ? "active" : "inactive")} ·{" "}
                    {t("patientsCount", { count: row.activePatientsCount })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">{rangeLabel}</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!pagination.hasPreviousPage || loading}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
            >
              <ChevronLeft className="size-4" />
              {t("prev")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!pagination.hasNextPage || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              {t("next")}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
