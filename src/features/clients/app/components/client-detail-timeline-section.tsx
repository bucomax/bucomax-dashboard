"use client";

import { ClientDetailCardTitle } from "@/features/clients/app/components/client-detail-card-title";
import { useClientTimeline } from "@/features/clients/app/hooks/use-client-timeline";
import { CLIENT_TIMELINE_EVENT_CATEGORIES } from "@/lib/clients/timeline-event-categories";
import type { ClientTimelineItemDto } from "@/types/api/clients-v1";
import {
  AuditTimelineList,
  TimelineCategoryIcon,
  timelineCategoryFilterChipCn,
  timelineCategoryIconClassForActiveFilter,
} from "@/shared/components/timeline/audit-timeline-list";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  History,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "@/lib/toast";

type ClientDetailTimelineSectionProps = {
  clientId: string;
  /** Incrementar após ações que geram eventos (ex.: transição de etapa). */
  refreshSignal: number;
};

function stringField(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function boolField(obj: Record<string, unknown>, key: string): boolean | null {
  const v = obj[key];
  return typeof v === "boolean" ? v : null;
}

function numberField(obj: Record<string, unknown>, key: string): number | null {
  const v = obj[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function stringArrayField(obj: Record<string, unknown>, key: string): string[] {
  const v = obj[key];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

export function ClientDetailTimelineSection({ clientId, refreshSignal }: ClientDetailTimelineSectionProps) {
  const t = useTranslations("clients.detail");
  const { data: session } = useSession();
  const [exporting, setExporting] = useState(false);
  const canExportAudit =
    session?.user?.tenantRole === "tenant_admin" || session?.user?.globalRole === "super_admin";
  const {
    data,
    error,
    loading,
    page,
    setPage,
    reload,
    limit,
    selectedCategories,
    toggleCategory,
    selectAllCategories,
  } = useClientTimeline(clientId, refreshSignal);

  async function downloadAuditExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/v1/clients/${clientId}/audit-export`, { credentials: "include" });
      if (!res.ok) {
        const body: { success?: boolean; error?: { message?: string } } = await res.json().catch(() => ({}));
        toast.error(body.error?.message ?? t("timeline.exportError"));
        return;
      }
      const cd = res.headers.get("Content-Disposition");
      let filename = `audit-export-${clientId.slice(0, 8)}.csv`;
      const m = cd?.match(/filename="([^"]+)"/);
      if (m?.[1]) filename = m[1];
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      await reload();
    } catch {
      toast.error(t("timeline.exportError"));
    } finally {
      setExporting(false);
    }
  }

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
      return {
        title: t("timeline.audit.fileUpload"),
        subtitle: [
          new Date(item.createdAt).toLocaleString(),
          actorLabel,
          t("timeline.audit.fileMeta", { id }),
        ].join(" · "),
      };
    }

    if (item.type === "PATIENT_PORTAL_FILE_SUBMITTED") {
      const id = stringField(item.payload, "fileAssetId") ?? "—";
      return {
        title: t("timeline.audit.portalFileSubmitted"),
        subtitle: [
          new Date(item.createdAt).toLocaleString(),
          t("timeline.actorPublic"),
          t("timeline.audit.fileMeta", { id }),
        ].join(" · "),
      };
    }

    if (item.type === "PATIENT_PORTAL_FILE_APPROVED") {
      const id = stringField(item.payload, "fileAssetId") ?? "—";
      return {
        title: t("timeline.audit.portalFileApproved"),
        subtitle: [
          new Date(item.createdAt).toLocaleString(),
          actorLabel,
          t("timeline.audit.fileMeta", { id }),
        ].join(" · "),
      };
    }

    if (item.type === "PATIENT_PORTAL_FILE_REJECTED") {
      const id = stringField(item.payload, "fileAssetId") ?? "—";
      const reason = stringField(item.payload, "rejectReason");
      return {
        title: t("timeline.audit.portalFileRejected"),
        subtitle: [
          new Date(item.createdAt).toLocaleString(),
          actorLabel,
          t("timeline.audit.fileMeta", { id }),
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

    if (item.type === "PATIENT_PORTAL_PASSWORD_SET") {
      return {
        title: t("timeline.audit.portalPasswordSet"),
        subtitle: [new Date(item.createdAt).toLocaleString(), t("timeline.actorPublic")].join(" · "),
      };
    }

    if (item.type === "PATIENT_PORTAL_SESSION_CREATED") {
      const method = stringField(item.payload, "method");
      const methodLabel =
        method === "magic_link"
          ? t("timeline.audit.portalSessionMethod.magic_link")
          : method === "otp"
            ? t("timeline.audit.portalSessionMethod.otp")
            : method === "password"
              ? t("timeline.audit.portalSessionMethod.password")
              : method ?? "—";
      return {
        title: t("timeline.audit.portalSessionCreated"),
        subtitle: [
          new Date(item.createdAt).toLocaleString(),
          t("timeline.actorPublic"),
          methodLabel,
        ].join(" · "),
      };
    }

    if (item.type === "PATIENT_PORTAL_LINK_GENERATED") {
      const single = boolField(item.payload, "singleUse");
      const mode =
        single === true
          ? t("timeline.audit.portalLinkSingleUse")
          : single === false
            ? t("timeline.audit.portalLinkMultiUse")
            : null;
      return {
        title: t("timeline.audit.portalLinkGenerated"),
        subtitle: [new Date(item.createdAt).toLocaleString(), actorLabel, mode].filter(Boolean).join(" · "),
      };
    }

    if (item.type === "PATIENT_CREATED") {
      return {
        title: t("timeline.audit.patientCreated"),
        subtitle: [new Date(item.createdAt).toLocaleString(), actorLabel].join(" · "),
      };
    }

    if (item.type === "PATIENT_UPDATED") {
      const fields = stringArrayField(item.payload, "changedFields");
      const fieldsLabel =
        fields.length > 0 ? t("timeline.audit.changedFields", { fields: fields.join(", ") }) : null;
      return {
        title: t("timeline.audit.patientUpdated"),
        subtitle: [new Date(item.createdAt).toLocaleString(), actorLabel, fieldsLabel].filter(Boolean).join(" · "),
      };
    }

    if (item.type === "PATIENT_DELETED") {
      return {
        title: t("timeline.audit.patientDeleted"),
        subtitle: [new Date(item.createdAt).toLocaleString(), actorLabel].join(" · "),
      };
    }

    if (item.type === "PATIENT_PATHWAY_STARTED") {
      const pathwayId = stringField(item.payload, "pathwayId") ?? "—";
      return {
        title: t("timeline.audit.pathwayStarted"),
        subtitle: [new Date(item.createdAt).toLocaleString(), actorLabel, pathwayId].join(" · "),
      };
    }

    if (item.type === "PATIENT_PATHWAY_COMPLETED") {
      const ppId = stringField(item.payload, "patientPathwayId") ?? "—";
      return {
        title: t("timeline.audit.pathwayCompleted"),
        subtitle: [new Date(item.createdAt).toLocaleString(), actorLabel, ppId].join(" · "),
      };
    }

    if (item.type === "FILE_DOWNLOADED_BY_STAFF") {
      const id = stringField(item.payload, "fileAssetId") ?? "—";
      return {
        title: t("timeline.audit.fileDownloadedStaff"),
        subtitle: [new Date(item.createdAt).toLocaleString(), actorLabel, id].join(" · "),
      };
    }

    if (item.type === "FILE_DOWNLOADED_BY_PATIENT") {
      const id = stringField(item.payload, "fileAssetId") ?? "—";
      return {
        title: t("timeline.audit.fileDownloadedPatient"),
        subtitle: [new Date(item.createdAt).toLocaleString(), t("timeline.actorPublic"), id].join(" · "),
      };
    }

    if (item.type === "CHECKLIST_ITEM_TOGGLED") {
      const itemId = stringField(item.payload, "itemId") ?? "—";
      const checked = boolField(item.payload, "checked");
      const state =
        checked === true
          ? t("timeline.audit.checklistChecked")
          : checked === false
            ? t("timeline.audit.checklistUnchecked")
            : null;
      return {
        title: t("timeline.audit.checklistItemToggled"),
        subtitle: [new Date(item.createdAt).toLocaleString(), actorLabel, itemId, state].filter(Boolean).join(" · "),
      };
    }

    if (item.type === "FILE_DELETED") {
      const id = stringField(item.payload, "fileAssetId") ?? "—";
      return {
        title: t("timeline.audit.fileDeleted"),
        subtitle: [new Date(item.createdAt).toLocaleString(), actorLabel, id].join(" · "),
      };
    }

    if (item.type === "PATIENT_PORTAL_LOGIN_FAILED") {
      const reason = stringField(item.payload, "reason");
      const reasonLabel =
        reason === "invalid_password"
          ? t("timeline.audit.portalLoginFailedReason.invalidPassword")
          : reason === "password_not_set"
            ? t("timeline.audit.portalLoginFailedReason.passwordNotSet")
            : reason ?? "—";
      return {
        title: t("timeline.audit.portalLoginFailed"),
        subtitle: [new Date(item.createdAt).toLocaleString(), t("timeline.actorPublic"), reasonLabel].join(" · "),
      };
    }

    if (item.type === "PATIENT_CONSENT_GIVEN") {
      const ct = stringField(item.payload, "consentType");
      const ver = stringField(item.payload, "version") ?? "—";
      const kindLabel =
        ct === "terms"
          ? t("timeline.audit.consentKind.terms")
          : ct === "lgpd"
            ? t("timeline.audit.consentKind.lgpd")
            : ct ?? "—";
      return {
        title: t("timeline.audit.consentGiven"),
        subtitle: [new Date(item.createdAt).toLocaleString(), t("timeline.actorPublic"), kindLabel, ver].join(" · "),
      };
    }

    if (item.type === "AUDIT_EXPORT_GENERATED") {
      const count = numberField(item.payload, "rowCount");
      return {
        title: t("timeline.audit.auditExportGenerated"),
        subtitle: [
          new Date(item.createdAt).toLocaleString(),
          actorLabel,
          count != null ? t("timeline.audit.auditExportMeta", { count }) : null,
        ]
          .filter(Boolean)
          .join(" · "),
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-6 w-48" />
            {canExportAudit ? <Skeleton className="h-9 w-44 shrink-0" /> : null}
          </div>
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ClientDetailCardTitle icon={History}>{t("timeline.title")}</ClientDetailCardTitle>
          {canExportAudit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={exporting}
              onClick={() => void downloadAuditExport()}
            >
              {exporting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
              {t("timeline.exportCsv")}
            </Button>
          ) : null}
        </div>
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
        <div className="bg-muted/25 border-border/60 space-y-3 rounded-xl border p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-2.5">
              <span className="bg-background text-muted-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border shadow-sm">
                <Filter className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 space-y-1">
                <p className="text-foreground text-sm font-medium leading-snug">{t("timeline.filtersLabel")}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">{t("timeline.filtersHint")}</p>
              </div>
            </div>
            {selectedCategories.size < CLIENT_TIMELINE_EVENT_CATEGORIES.length ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 shrink-0 self-start text-xs font-medium"
                onClick={selectAllCategories}
              >
                {t("timeline.filtersShowAll")}
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {CLIENT_TIMELINE_EVENT_CATEGORIES.map((cat) => {
              const active = selectedCategories.has(cat);
              const onlyOneLeft = active && selectedCategories.size === 1;
              return (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={active}
                  disabled={onlyOneLeft}
                  title={onlyOneLeft ? t("timeline.filtersKeepOneHint") : undefined}
                  onClick={() => toggleCategory(cat)}
                  className={timelineCategoryFilterChipCn(cat, active, onlyOneLeft)}
                >
                  <TimelineCategoryIcon
                    category={cat}
                    className={active ? timelineCategoryIconClassForActiveFilter(cat) : undefined}
                  />
                  <span className="min-w-0 break-words">{t(`timeline.categories.${cat}`)}</span>
                </button>
              );
            })}
          </div>
        </div>
        {data.items.length === 0 ? (
          <Alert variant="info">
            <Info className="size-4" aria-hidden />
            <AlertDescription>{emptyMessage}</AlertDescription>
          </Alert>
        ) : (
          <AuditTimelineList
            rows={data.items.map((item) => {
              const { title, subtitle } = lineForItem(item);
              return {
                id: `${item.kind}:${item.id}`,
                category: item.category,
                title,
                subtitle,
              };
            })}
          />
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
