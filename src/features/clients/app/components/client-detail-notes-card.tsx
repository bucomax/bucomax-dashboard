"use client";

import { ClientDetailCardTitle } from "@/features/clients/app/components/client-detail-card-title";
import { useCreateClientNote } from "@/features/clients/app/hooks/use-create-client-note";
import { useClientNotes } from "@/features/clients/app/hooks/use-client-notes";
import { toast } from "@/lib/toast";
import { formatListUpdatedAt } from "@/lib/utils/format-list-updated-at";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/shared/components/ui/card";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Save, StickyNote } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type ClientDetailNotesCardProps = {
  clientId: string;
};

export function ClientDetailNotesCard({ clientId }: ClientDetailNotesCardProps) {
  const t = useTranslations("clients.detail.notes");
  const locale = useLocale();
  const { data, error, loading, page, setPage, reload, limit } = useClientNotes(clientId);
  const { creating: saving, createNote } = useCreateClientNote();
  const [draft, setDraft] = useState("");

  const noteDirty = draft.trim().length > 0;
  const pagination = data?.pagination;
  const from =
    pagination && pagination.totalItems > 0 ? (page - 1) * limit + 1 : 0;
  const to =
    pagination && pagination.totalItems > 0 ? Math.min(page * limit, pagination.totalItems) : 0;

  const saveDisabled = useMemo(() => saving || !noteDirty, [saving, noteDirty]);

  async function handleCreateNote() {
    const content = draft.trim();
    if (!content) return;

    try {
      await createNote(clientId, content);
      setDraft("");
      toast.success(t("saved"));
      if (page !== 1) {
        setPage(1);
      } else {
        reload();
      }
    } catch {
      /* erro: toast global no apiClient */
    }
  }

  return (
    <Card className="min-w-0">
      <CardHeader>
        <ClientDetailCardTitle icon={StickyNote}>{t("title")}</ClientDetailCardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field>
          <FieldLabel htmlFor="client-detail-note-content">{t("label")}</FieldLabel>
          <textarea
            id="client-detail-note-content"
            rows={4}
            maxLength={10_000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={saving}
            className={cn(
              "border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[4.5rem] w-full rounded-lg border px-2.5 py-2 text-base transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
            )}
            placeholder={t("placeholder")}
          />
        </Field>
        <Button type="button" size="sm" disabled={saveDisabled} onClick={() => void handleCreateNote()}>
          {saving ? (
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4 shrink-0" aria-hidden />
          )}
          {saving ? t("saving") : t("save")}
        </Button>

        {error ? (
          <div className="space-y-2">
            <p className="text-destructive text-sm">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
              <RefreshCw className="size-4" />
              {t("retry")}
            </Button>
          </div>
        ) : null}

        <div className="space-y-3 border-t pt-4">
          <p className="text-muted-foreground text-sm">
            {pagination && pagination.totalItems > 0
              ? t("range", { from, to, total: pagination.totalItems })
              : t("empty")}
          </p>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-muted/40 rounded-lg border p-4">
                  <div className="bg-muted h-4 w-36 rounded" />
                  <div className="bg-muted mt-3 h-3 w-full rounded" />
                  <div className="bg-muted mt-2 h-3 w-2/3 rounded" />
                </div>
              ))}
            </div>
          ) : data && data.data.length > 0 ? (
            <ul className="space-y-3">
              {data.data.map((note) => (
                <li key={note.id} className="rounded-lg border p-4">
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  <p className="text-muted-foreground mt-3 text-xs tabular-nums">
                    {t("byline", {
                      author: note.author.name ?? note.author.email,
                      date: formatListUpdatedAt(note.createdAt, locale),
                    })}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">{t("noRows")}</p>
          )}

          {pagination && pagination.totalPages > 1 ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!pagination.hasPreviousPage || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
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
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
