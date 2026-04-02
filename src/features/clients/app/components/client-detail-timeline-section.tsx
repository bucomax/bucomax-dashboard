"use client";

import { ClientDetailCardTitle } from "@/features/clients/app/components/client-detail-card-title";
import { useClientTimeline } from "@/features/clients/app/hooks/use-client-timeline";
import type { ClientTimelineItemDto } from "@/types/api/clients-v1";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ChevronLeft, ChevronRight, History, Info, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

type ClientDetailTimelineSectionProps = {
  clientId: string;
  /** Incrementar após ações que geram eventos (ex.: transição de etapa). */
  refreshSignal: number;
};

function stringField(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function ClientDetailTimelineSection({ clientId, refreshSignal }: ClientDetailTimelineSectionProps) {
  const t = useTranslations("clients.detail");
  const { data, error, loading, page, setPage, reload, limit } = useClientTimeline(clientId, refreshSignal);

  function lineForItem(item: ClientTimelineItemDto): { title: string; subtitle: string } {
    if (item.kind === "legacy_transition") {
      const from = item.fromStage?.name ?? t("history.start");
      const sub = [
        new Date(item.createdAt).toLocaleString(),
        item.actor.name ?? item.actor.email,
        item.note?.trim() || null,
        item.ruleOverrideReason
          ? t("history.overrideSummary", {
              reason: item.ruleOverrideReason,
              by: item.forcedBy?.name?.trim() || item.forcedBy?.email || "—",
            })
          : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return { title: `${from} → ${item.toStage.name}`, subtitle: sub };
    }

    const actorLabel =
      item.actor != null ? (item.actor.name ?? item.actor.email) : t("timeline.actorPublic");

    if (item.type === "STAGE_TRANSITION") {
      const p = item.payload;
      const from = stringField(p, "fromStageName") ?? t("history.start");
      const to = stringField(p, "toStageName") ?? "—";
      const forced = p.forcedOverride === true;
      const reason = stringField(p, "ruleOverrideReason");
      const sub = [
        new Date(item.createdAt).toLocaleString(),
        actorLabel,
        forced && reason
          ? t("history.overrideSummary", { reason, by: actorLabel })
          : forced
            ? t("timeline.forcedNoReason")
            : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return { title: `${t("timeline.audit.stageTransition")}: ${from} → ${to}`, subtitle: sub };
    }

    if (item.type === "FILE_UPLOADED_TO_CLIENT") {
      const id = stringField(item.payload, "fileAssetId") ?? "—";
      const mime = stringField(item.payload, "mimeType") ?? "—";
      return {
        title: t("timeline.audit.fileUpload"),
        subtitle: [
          new Date(item.createdAt).toLocaleString(),
          actorLabel,
          t("timeline.audit.fileMeta", { id, mime }),
        ].join(" · "),
      };
    }

    if (item.type === "PATIENT_PORTAL_FILE_SUBMITTED") {
      const id = stringField(item.payload, "fileAssetId") ?? "—";
      const mime = stringField(item.payload, "mimeType") ?? "—";
      return {
        title: t("timeline.audit.portalFileSubmitted"),
        subtitle: [
          new Date(item.createdAt).toLocaleString(),
          t("timeline.actorPublic"),
          t("timeline.audit.fileMeta", { id, mime }),
        ].join(" · "),
      };
    }

    if (item.type === "PATIENT_PORTAL_FILE_APPROVED") {
      const id = stringField(item.payload, "fileAssetId") ?? "—";
      const mime = stringField(item.payload, "mimeType") ?? "—";
      return {
        title: t("timeline.audit.portalFileApproved"),
        subtitle: [
          new Date(item.createdAt).toLocaleString(),
          actorLabel,
          t("timeline.audit.fileMeta", { id, mime }),
        ].join(" · "),
      };
    }

    if (item.type === "PATIENT_PORTAL_FILE_REJECTED") {
      const id = stringField(item.payload, "fileAssetId") ?? "—";
      const mime = stringField(item.payload, "mimeType") ?? "—";
      const reason = stringField(item.payload, "rejectReason");
      return {
        title: t("timeline.audit.portalFileRejected"),
        subtitle: [
          new Date(item.createdAt).toLocaleString(),
          actorLabel,
          t("timeline.audit.fileMeta", { id, mime }),
          reason ?? null,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    }

    if (item.type === "SELF_REGISTER_COMPLETED") {
      const mode = item.payload.mode === "update" ? "update" : "create";
      const title =
        mode === "update"
          ? t("timeline.audit.selfRegisterUpdate")
          : t("timeline.audit.selfRegister");
      return {
        title,
        subtitle: [new Date(item.createdAt).toLocaleString(), t("timeline.actorPublic")].join(" · "),
      };
    }

    return {
      title: item.type,
      subtitle: new Date(item.createdAt).toLocaleString(),
    };
  }

  const pag = data?.pagination;
  const from =
    pag && pag.totalItems === 0 ? 0 : pag ? (page - 1) * limit + 1 : 0;
  const to =
    pag && pag.totalItems === 0 ? 0 : pag ? Math.min(page * limit, pag.totalItems) : 0;

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <ClientDetailCardTitle icon={History}>{t("timeline.title")}</ClientDetailCardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-destructive text-sm">{error ?? t("timeline.loadError")}</p>
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => void reload()}>
            <RefreshCw className="size-4" />
            {t("retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const emptyMessage =
    pag && pag.totalItems > 0 ? t("timeline.noRows") : t("timeline.empty");

  return (
    <Card>
      <CardHeader>
        <ClientDetailCardTitle icon={History}>{t("timeline.title")}</ClientDetailCardTitle>
        <CardDescription className="space-y-1">
          <p>{t("timeline.description")}</p>
          {data.timelineCapped ? (
            <p className="text-amber-700 dark:text-amber-400 text-xs">{t("timeline.cappedHint")}</p>
          ) : null}
          {pag && pag.totalItems > 0 ? (
            <p>{t("timeline.range", { from, to, total: pag.totalItems })}</p>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.items.length === 0 ? (
          <Alert variant="info">
            <Info className="size-4" aria-hidden />
            <AlertDescription>{emptyMessage}</AlertDescription>
          </Alert>
        ) : (
          <ul className="divide-border divide-y text-sm">
            {data.items.map((item) => {
              const { title, subtitle } = lineForItem(item);
              return (
                <li key={`${item.kind}:${item.id}`} className="flex flex-col gap-1 py-3">
                  <span className="font-medium">{title}</span>
                  <span className="text-muted-foreground text-xs">{subtitle}</span>
                </li>
              );
            })}
          </ul>
        )}
        {pag && pag.totalPages > 1 ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!pag.hasPreviousPage || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
              {t("timeline.prev")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!pag.hasNextPage || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("timeline.next")}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
