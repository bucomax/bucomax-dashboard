"use client";

import { listPathways, postPathway } from "@/features/pathways/app/services/pathways.service";
import { toast } from "@/lib/toast";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

export function PathwaysList() {
  const t = useTranslations("pathways.list");
  const router = useRouter();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listPathways>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listPathways();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setRows([]);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(t("name"));
      return;
    }
    setCreating(true);
    try {
      const p = await postPathway({ name: trimmed });
      setName("");
      toast.success(t("createSuccess"));
      router.push(`/dashboard/pathways/${p.id}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("loadError"));
    } finally {
      setCreating(false);
    }
  }

  if (rows === null && !error) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-destructive text-sm">{error}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <label className="text-sm font-medium" htmlFor="new-pathway-name">
            {t("name")}
          </label>
          <Input
            id="new-pathway-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
          />
        </div>
        <Button type="button" onClick={() => void handleCreate()} disabled={creating}>
          {creating ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("newPathway")}
        </Button>
      </div>

      {!rows?.length ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <div className="divide-border rounded-xl border">
          <div className="text-muted-foreground grid grid-cols-2 gap-2 border-b px-4 py-2 text-xs font-medium md:grid-cols-3">
            <span>{t("columnPathway")}</span>
            <span className="hidden md:block">{t("columnPublish")}</span>
            <span className="text-right" />
          </div>
          <ul className="divide-y">
            {rows.map((p) => (
              <li key={p.id} className="grid grid-cols-2 items-center gap-2 px-4 py-3 text-sm md:grid-cols-3">
                <span className="min-w-0 font-medium">{p.name}</span>
                <span className="text-muted-foreground hidden text-xs md:block">
                  {p.publishedVersion
                    ? t("published", { version: p.publishedVersion.version })
                    : t("noPublished")}
                </span>
                <div className="flex justify-end">
                  <Button nativeButton={false} size="sm" variant="outline" render={<Link href={`/dashboard/pathways/${p.id}`} />}>
                    {t("open")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
