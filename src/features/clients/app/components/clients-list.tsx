"use client";

import { listClients } from "@/features/clients/app/services/clients.service";
import type { ClientDto } from "@/features/clients/app/types/api";
import { Link } from "@/i18n/navigation";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

export function ClientsList() {
  const t = useTranslations("clients.list");
  const [rows, setRows] = useState<ClientDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const data = await listClients({ limit: 50 });
      setRows(data.clients);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setRows([]);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listClients({ limit: 50 });
        if (!cancelled) {
          setRows(data.clients);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("loadError"));
          setRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (rows === null && !error) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-destructive text-sm">{error}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void fetchClients()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (!rows?.length) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <div className="divide-border rounded-xl border">
      <div className="text-muted-foreground grid grid-cols-2 gap-2 border-b px-4 py-2 text-xs font-medium md:grid-cols-5">
        <span>{t("columns.name")}</span>
        <span>{t("columns.phone")}</span>
        <span className="hidden md:block">{t("journey")}</span>
        <span className="hidden md:block">{t("columns.document")}</span>
        <span className="hidden sm:block">{t("columns.updated")}</span>
      </div>
      <ul className="divide-y">
        {rows.map((c) => (
          <li key={c.id} className="grid grid-cols-2 gap-2 px-4 py-3 text-sm md:grid-cols-5">
            <span className="font-medium">{c.name}</span>
            <span>{c.phone}</span>
            <span className="hidden md:flex md:items-center">
              {c.patientPathwayId ? (
                <Button
                  nativeButton={false}
                  size="sm"
                  variant="link"
                  className="h-auto px-0"
                  render={<Link href={`/dashboard/patient-pathways/${c.patientPathwayId}`} />}
                >
                  {t("journey")}
                </Button>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </span>
            <span className="text-muted-foreground hidden md:block">{c.documentId ?? "—"}</span>
            <span className="text-muted-foreground hidden text-xs sm:block">
              {new Date(c.updatedAt).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
