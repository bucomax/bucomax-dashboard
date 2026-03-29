"use client";

import { ClientCompletedTreatmentsSection } from "@/features/clients/app/components/client-completed-treatments-section";
import { ClientDetailCardTitle } from "@/features/clients/app/components/client-detail-card-title";
import { JourneyStagesList } from "@/features/clients/app/components/client-detail-journey-stages-list";
import { ClientDetailFilesCard } from "@/features/clients/app/components/client-detail-files-card";
import { ClientDetailNotesCard } from "@/features/clients/app/components/client-detail-notes-card";
import { ClientDetailProfileCard } from "@/features/clients/app/components/client-detail-profile-card";
import { useClientDetail } from "@/features/clients/app/hooks/use-client-detail";
import { useClientPathwayActions } from "@/features/clients/app/hooks/use-client-pathway-actions";
import { useUpdateClient } from "@/features/clients/app/hooks/use-update-client";
import { Link } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { formatCpfDisplay } from "@/lib/validators/cpf";
import { slaHealthPillClassName } from "@/lib/utils/sla-status-ui";
import type { SlaHealthStatus } from "@/lib/pathway/sla-health";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/shared/components/ui/card";
import { Dialog, StandardDialogContent } from "@/shared/components/ui/dialog";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRightLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  FileText,
  GitBranch,
  History,
  Info,
  ListChecks,
  Loader2,
  MapPinned,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

function waDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

function SlaPill({ status, label }: { status: SlaHealthStatus; label: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${slaHealthPillClassName(status)}`}>
      {label}
    </span>
  );
}

type ClientDetailViewProps = {
  clientId: string;
};

export function ClientDetailView({ clientId }: ClientDetailViewProps) {
  const t = useTranslations("clients.detail");
  const tp = useTranslations("pathways.patient");
  const locale = useLocale();
  const {
    data,
    error,
    loading,
    transitionsPage,
    setTransitionsPage,
    reload,
    transitionsLimit,
  } = useClientDetail(clientId);
  const { updateClientById, updating: savingNotes } = useUpdateClient();
  const {
    transitioning: submitting,
    updatingChecklistItemId,
    transitionClientStage,
    toggleChecklistItem,
  } = useClientPathwayActions();

  const [toStageId, setToStageId] = useState("");
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [draftCaseDescription, setDraftCaseDescription] = useState("");

  useEffect(() => {
    const c = data?.client;
    if (!c) return;
    setDraftCaseDescription(c.caseDescription ?? "");
  }, [data?.client?.id, data?.client?.updatedAt]);

  const pp = data?.patientPathway;
  const nextOptions = useMemo(() => {
    if (!pp?.pathwayVersion?.stages?.length) return [];
    const cur = pp.currentStage?.id;
    return pp.pathwayVersion.stages.filter((s) => s.id !== cur);
  }, [pp]);

  const slaLabel = (status: SlaHealthStatus) =>
    status === "ok" ? t("sla.ok") : status === "warning" ? t("sla.warning") : t("sla.danger");

  function openTransitionConfirm() {
    if (!pp || !toStageId) {
      toast.error(tp("toStagePlaceholder"));
      return;
    }
    if (toStageId === pp.currentStage?.id) {
      toast.error(tp("sameStage"));
      return;
    }
    setConfirmOpen(true);
  }

  async function executeTransition() {
    if (!pp || !toStageId) return;
    try {
      await transitionClientStage(pp.id, {
        toStageId,
        note: note.trim() || undefined,
      });
      toast.success(tp("success"));
      setConfirmOpen(false);
      setToStageId("");
      setNote("");
      if (transitionsPage !== 1) {
        setTransitionsPage(1);
      } else {
        reload();
      }
    } catch {
      /* erro: toast global no apiClient */
    }
  }

  const targetStageName = useMemo(
    () => nextOptions.find((s) => s.id === toStageId)?.name ?? "",
    [nextOptions, toStageId],
  );

  const targetStageDocuments = useMemo(() => {
    if (!pp || !toStageId) return [];
    return pp.pathwayVersion.stages.find((s) => s.id === toStageId)?.documents ?? [];
  }, [pp, toStageId]);

  const currentStageChecklist = pp?.currentStage?.checklistItems ?? [];
  const completedChecklistCount = currentStageChecklist.filter((item) => item.completed).length;

  const notesDirty = useMemo(() => {
    if (!data?.client) return false;
    const server = data.client.caseDescription ?? null;
    const draft = draftCaseDescription.trim() === "" ? null : draftCaseDescription.trim();
    return draft !== server;
  }, [data?.client?.caseDescription, data?.client?.id, draftCaseDescription]);

  async function saveCaseDescription() {
    const trimmed = draftCaseDescription.trim();
    const payload = trimmed === "" ? null : trimmed;
    try {
      await updateClientById(clientId, { caseDescription: payload });
      toast.success(t("caseNotes.saved"));
      reload();
    } catch {
      /* erro: toast global no apiClient */
    }
  }

  async function handleChecklistToggle(checklistItemId: string, completed: boolean) {
    if (!pp) return;
    try {
      await toggleChecklistItem(pp.id, checklistItemId, completed);
      reload();
    } catch {
      /* erro: toast global no apiClient */
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-2/3 max-w-md" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-destructive text-sm">{error ?? t("loadError")}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
          <RefreshCw className="size-4" />
          {t("retry")}
        </Button>
        <Button nativeButton={false} variant="link" size="sm" className="w-fit px-0" render={<Link href="/dashboard/clients" />}>
          <ArrowLeft className="size-4" />
          {t("backToList")}
        </Button>
      </div>
    );
  }

  const { client } = data;
  const digits = waDigits(client.phone);
  const tpag = pp?.transitions.pagination;
  const from =
    tpag && tpag.totalItems === 0 ? 0 : tpag ? (transitionsPage - 1) * transitionsLimit + 1 : 0;
  const to =
    tpag && tpag.totalItems === 0 ? 0 : tpag ? Math.min(transitionsPage * transitionsLimit, tpag.totalItems) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{client.name}</h2>
          <p className="text-muted-foreground text-sm">{client.phone}</p>
          {client.documentId ? (
            <p className="text-muted-foreground text-sm">
              <span className="text-muted-foreground/80">{t("cpf")}</span>{" "}
              <span className="tabular-nums">{formatCpfDisplay(client.documentId)}</span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {digits ? (
            <Button nativeButton={false} variant="outline" size="sm" render={<a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" />}>
              <ExternalLink className="size-4" />
              {t("whatsapp")}
            </Button>
          ) : null}
          <Button nativeButton={false} variant="ghost" size="sm" render={<Link href="/dashboard/clients" />}>
            <ArrowLeft className="size-4" />
            {t("backToList")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
      <Card>
        <CardHeader>
          <ClientDetailCardTitle icon={FileText}>{t("caseNotes.title")}</ClientDetailCardTitle>
          <CardDescription>{t("caseNotes.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field>
            <FieldLabel htmlFor="client-case-description">{t("caseNotes.label")}</FieldLabel>
            <textarea
              id="client-case-description"
              rows={5}
              maxLength={20_000}
              value={draftCaseDescription}
              onChange={(e) => setDraftCaseDescription(e.target.value)}
              disabled={savingNotes}
              className={cn(
                "border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[4.5rem] w-full max-w-2xl rounded-lg border px-2.5 py-2 text-base transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
              )}
            />
          </Field>
          <Button
            type="button"
            size="sm"
            disabled={!notesDirty || savingNotes}
            onClick={() => void saveCaseDescription()}
          >
            {savingNotes ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {savingNotes ? t("caseNotes.saving") : t("caseNotes.save")}
          </Button>
        </CardContent>
      </Card>

      <ClientDetailNotesCard clientId={clientId} />

      <ClientDetailFilesCard clientId={clientId} />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
      <ClientDetailProfileCard clientId={clientId} client={client} onSaved={reload} />

      {!pp ? (
        <Card>
          <CardHeader>
            <ClientDetailCardTitle icon={MapPinned}>{t("noPathway.title")}</ClientDetailCardTitle>
            <CardDescription>
              {(data.completedTreatments ?? []).length > 0
                ? t("noPathway.descriptionWithHistory")
                : t("noPathway.description")}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <ClientDetailCardTitle icon={GitBranch}>{t("journey.title")}</ClientDetailCardTitle>
              <CardDescription>{pp.pathway.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pp.completedAt ? (
                <Alert variant="info">
                  <Info className="size-4" aria-hidden />
                  <AlertDescription>
                    {t("journey.completedBanner", {
                      date: new Date(pp.completedAt).toLocaleString(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }),
                    })}
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="bg-muted/25 flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 text-sm">
                <span className="text-muted-foreground">{t("journey.currentStage")}</span>
                <span className="font-medium">{pp.completedAt ? "—" : (pp.currentStage?.name ?? "—")}</span>
                {pp.completedAt ? null : (
                  <>
                    <span className="text-muted-foreground">
                      {t("journey.daysInStage", { days: pp.daysInStage })}
                    </span>
                    <SlaPill status={pp.slaStatus} label={slaLabel(pp.slaStatus)} />
                  </>
                )}
              </div>
              <JourneyStagesList
                stages={pp.pathwayVersion.stages}
                current={pp.currentStage ?? null}
                journeyCompleted={pp.completedAt != null}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <ClientDetailCardTitle icon={ListChecks}>{t("checklist.title")}</ClientDetailCardTitle>
              <CardDescription>
                {pp.completedAt
                  ? t("journey.readOnlyHint")
                  : pp.currentStage
                    ? t("checklist.description", { stage: pp.currentStage.name })
                    : t("checklist.descriptionEmpty")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pp.currentStage ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{t("checklist.progressLabel")}</span>
                  <span className="font-medium">
                    {t("checklist.progress", {
                      completed: completedChecklistCount,
                      total: currentStageChecklist.length,
                    })}
                  </span>
                </div>
              ) : null}
              {currentStageChecklist.length === 0 ? (
                <Alert variant="info">
                  <Info className="size-4" aria-hidden />
                  <AlertDescription>
                    {pp.currentStage ? t("checklist.empty") : t("checklist.descriptionEmpty")}
                  </AlertDescription>
                </Alert>
              ) : (
                <ul className="space-y-2">
                  {currentStageChecklist.map((item) => {
                    const isUpdating = updatingChecklistItemId === item.id;
                    const pathwayClosed = pp.completedAt != null;
                    return (
                      <li key={item.id}>
                        <label
                          className={cn(
                            "flex items-start gap-3 rounded-lg border p-3 text-sm",
                            pathwayClosed ? "cursor-default" : "cursor-pointer",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={item.completed}
                            disabled={isUpdating || pathwayClosed}
                            onChange={(e) => void handleChecklistToggle(item.id, e.target.checked)}
                            className="mt-0.5 size-4"
                          />
                          <span className="min-w-0 flex-1">
                            <span className={cn("block", item.completed && "text-muted-foreground line-through")}>
                              {item.label}
                            </span>
                            {item.completedAt ? (
                              <span className="text-muted-foreground mt-1 block text-xs">
                                {t("checklist.completedAt", {
                                  date: new Date(item.completedAt).toLocaleString(),
                                })}
                              </span>
                            ) : null}
                          </span>
                          {isUpdating ? <Loader2 className="text-muted-foreground size-4 animate-spin" /> : null}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {pp.completedAt ? null : (
            <>
              <Card>
                <CardHeader>
                  <ClientDetailCardTitle icon={ArrowRightLeft}>{t("transition.title")}</ClientDetailCardTitle>
                  <CardDescription>{t("transition.description")}</CardDescription>
                </CardHeader>
                <CardContent className="w-full min-w-0 space-y-4">
                  <Field>
                    <FieldLabel>{tp("toStage")}</FieldLabel>
                    <Select value={toStageId || undefined} onValueChange={(v) => setToStageId(v ?? "")}>
                      <SelectTrigger className="w-full min-w-0">
                        <SelectValue placeholder={tp("toStagePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {nextOptions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="client-detail-note">{tp("note")}</FieldLabel>
                    <Input
                      id="client-detail-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="—"
                      className="w-full min-w-0"
                    />
                  </Field>
                  <Button
                    type="button"
                    onClick={() => openTransitionConfirm()}
                    disabled={submitting || nextOptions.length === 0 || !toStageId}
                  >
                    <ClipboardCheck className="size-4" />
                    {t("transition.review")}
                  </Button>
                </CardContent>
              </Card>

              <Dialog
                open={confirmOpen}
                onOpenChange={(open) => {
                  if (!submitting) setConfirmOpen(open);
                }}
              >
            <StandardDialogContent
              size="sm"
              showCloseButton={!submitting}
              title={t("transition.confirmTitle")}
              description={t("transition.confirmDescription")}
              bodyClassName="py-3"
              footer={
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmOpen(false)}
                    disabled={submitting}
                  >
                    <X className="size-4" />
                    {t("transition.cancelConfirm")}
                  </Button>
                  <Button type="button" onClick={() => void executeTransition()} disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    {t("transition.confirmSubmit")}
                  </Button>
                </>
              }
            >
              <div className="text-sm">
                <p>
                  <span className="text-muted-foreground">{t("transition.summaryFrom")} </span>
                  <span className="font-medium">{pp.currentStage?.name ?? "—"}</span>
                </p>
                <p className="mt-2">
                  <span className="text-muted-foreground">{t("transition.summaryTo")} </span>
                  <span className="font-medium">{targetStageName || "—"}</span>
                </p>
                {note.trim() ? (
                  <p className="text-muted-foreground mt-3 text-xs">
                    {t("transition.notePreview", { text: note.trim() })}
                  </p>
                ) : null}
                <div className="mt-4 border-t pt-3">
                  <p className="text-muted-foreground text-xs font-medium">
                    {t("transition.stageDocumentsTitle")}
                  </p>
                  {targetStageDocuments.length === 0 ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {t("transition.stageDocumentsEmpty")}
                    </p>
                  ) : (
                    <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs">
                      {targetStageDocuments.map((d) => (
                        <li key={d.id}>
                          {d.file.fileName}
                          <span className="text-muted-foreground"> · {d.file.mimeType}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </StandardDialogContent>
          </Dialog>
            </>
          )}

          <Card>
            <CardHeader>
              <ClientDetailCardTitle icon={History}>{t("history.title")}</ClientDetailCardTitle>
              <CardDescription>
                {tpag && tpag.totalItems > 0
                  ? t("history.range", { from, to, total: tpag.totalItems })
                  : t("history.empty")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pp.transitions.data.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("history.noRows")}</p>
              ) : (
                <ul className="divide-border divide-y text-sm">
                  {pp.transitions.data.map((tr) => (
                    <li key={tr.id} className="flex flex-col gap-1 py-3">
                      <span className="font-medium">
                        {tr.fromStage?.name ?? t("history.start")} → {tr.toStage.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(tr.createdAt).toLocaleString()} ·{" "}
                        {tr.actor.name ?? tr.actor.email}
                        {tr.note ? ` · ${tr.note}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {tpag && tpag.totalPages > 1 ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!tpag.hasPreviousPage}
                    onClick={() => setTransitionsPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-4" />
                    {t("history.prev")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!tpag.hasNextPage}
                    onClick={() => setTransitionsPage((p) => p + 1)}
                  >
                    {t("history.next")}
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
        </div>
      </div>

      <ClientCompletedTreatmentsSection
        client={client}
        items={data.completedTreatments ?? []}
      />
    </div>
  );
}
