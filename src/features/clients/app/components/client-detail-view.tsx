"use client";

import { ClientDetailAssigneeOverviewCard } from "@/features/clients/app/components/client-detail-assignee-overview-card";
import { ClientDetailTimelineSection } from "@/features/clients/app/components/client-detail-timeline-section";
import { PatientSelfRegisterQrDialog } from "@/features/clients/app/components/patient-self-register-qr-dialog";
import { ClientCompletedTreatmentsSection } from "@/features/clients/app/components/client-completed-treatments-section";
import { ClientDetailCardTitle } from "@/features/clients/app/components/client-detail-card-title";
import { JourneyStagesList } from "@/features/clients/app/components/client-detail-journey-stages-list";
import { ClientDetailFilesCard } from "@/features/clients/app/components/client-detail-files-card";
import { ClientDetailNotesCard } from "@/features/clients/app/components/client-detail-notes-card";
import { ClientDetailProfileCard } from "@/features/clients/app/components/client-detail-profile-card";
import { createPatientPortalLink } from "@/features/clients/app/services/clients.service";
import { useClientDetail } from "@/features/clients/app/hooks/use-client-detail";
import { useClientPathwayActions } from "@/features/clients/app/hooks/use-client-pathway-actions";
import { useUpdateClient } from "@/features/clients/app/hooks/use-update-client";
import { TransitionBlockedByChecklistError } from "@/features/pathways/app/services/patient-pathways.service";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
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
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  GitBranch,
  Info,
  ListChecks,
  Loader2,
  Mail,
  MapPinned,
  Phone,
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
  const { data, error, loading, reload } = useClientDetail(clientId);
  const { updateClientById, updating: savingNotes } = useUpdateClient();
  const {
    transitioning: submitting,
    updatingChecklistItemId,
    transitionClientStage,
    toggleChecklistItem,
  } = useClientPathwayActions();

  const [toStageId, setToStageId] = useState("");
  const [note, setNote] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [draftCaseDescription, setDraftCaseDescription] = useState("");
  const [timelineRefresh, setTimelineRefresh] = useState(0);
  const [portalLinkBusy, setPortalLinkBusy] = useState<"email" | "copy" | null>(null);

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
    const needsForce = incompleteRequiredChecklist.length > 0;
    const trimmedOverride = overrideReason.trim();
    if (needsForce && trimmedOverride.length < 10) {
      toast.error(t("transition.overrideReasonMin"));
      return;
    }
    try {
      await transitionClientStage(pp.id, {
        toStageId,
        note: note.trim() || undefined,
        ...(needsForce ? { force: true, overrideReason: trimmedOverride } : {}),
      });
      toast.success(tp("success"));
      setConfirmOpen(false);
      setToStageId("");
      setNote("");
      setOverrideReason("");
      reload();
      setTimelineRefresh((n) => n + 1);
    } catch (e) {
      if (e instanceof TransitionBlockedByChecklistError) {
        toast.error(e.message);
        return;
      }
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
  const incompleteRequiredChecklist = useMemo(
    () => currentStageChecklist.filter((item) => item.requiredForTransition && !item.completed),
    [currentStageChecklist],
  );

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

  async function handlePatientPortalLink(mode: "email" | "copy") {
    if (portalLinkBusy) return;
    const sendEmail = mode === "email";
    if (sendEmail && !client.email?.trim()) {
      toast.error(t("portalLink.emailRequired"));
      return;
    }
    setPortalLinkBusy(mode);
    try {
      const result = await createPatientPortalLink(client.id, { sendEmail });
      if (result.emailSent) {
        toast.success(t("portalLink.emailSent"));
      } else {
        try {
          await navigator.clipboard.writeText(result.enterUrl);
          toast.success(t("portalLink.linkCopied"));
        } catch {
          window.prompt(t("portalLink.copyManually"), result.enterUrl);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("portalLink.error"));
    } finally {
      setPortalLinkBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 border-b border-border/60 pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="min-w-0 flex-1 space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight md:text-[1.65rem]">{client.name}</h2>
            <ul className="text-muted-foreground grid list-none gap-x-6 gap-y-2 text-sm sm:grid-cols-2 sm:gap-y-2.5">
              {client.phone?.trim() ? (
                <li className="flex min-w-0 items-center gap-2.5">
                  <span className="bg-muted/60 text-muted-foreground/90 inline-flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Phone className="size-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 tabular-nums">{client.phone}</span>
                </li>
              ) : null}
              {client.documentId ? (
                <li className="flex min-w-0 items-center gap-2.5">
                  <span className="bg-muted/60 text-muted-foreground/90 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold tracking-wide">
                    CPF
                  </span>
                  <span className="min-w-0 tabular-nums">{formatCpfDisplay(client.documentId)}</span>
                </li>
              ) : null}
              {client.email?.trim() ? (
                <li className="flex min-w-0 items-center gap-2.5 sm:col-span-2">
                  <span className="bg-muted/60 text-muted-foreground/90 inline-flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Mail className="size-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 truncate" title={client.email}>
                    {client.email}
                  </span>
                </li>
              ) : null}
            </ul>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-3 lg:max-w-xl lg:shrink-0">
            <div className="bg-muted/15 border-border/70 rounded-xl border p-2.5">
              <p className="text-muted-foreground mb-2 px-1 text-xs font-medium">{t("headerActionsLabel")}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-background/80"
                  disabled={portalLinkBusy !== null || !client.email?.trim()}
                  title={!client.email?.trim() ? t("portalLink.emailRequired") : undefined}
                  onClick={() => void handlePatientPortalLink("email")}
                >
                  {portalLinkBusy === "email" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Mail className="size-4" />
                  )}
                  {t("portalLink.sendEmail")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-background/80"
                  disabled={portalLinkBusy !== null}
                  onClick={() => void handlePatientPortalLink("copy")}
                >
                  {portalLinkBusy === "copy" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {t("portalLink.copyOnly")}
                </Button>
                <PatientSelfRegisterQrDialog
                  clientId={client.id}
                  triggerLabel={t("selfRegisterLinkThisPatient")}
                  triggerClassName="bg-background/80"
                />
                {digits ? (
                  <Button
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                    className="bg-background/80"
                    render={<a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" />}
                  >
                    <ExternalLink className="size-4" />
                    {t("whatsapp")}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="flex justify-start lg:justify-end">
              <Button nativeButton={false} variant="ghost" size="sm" className="-mx-1 text-muted-foreground" render={<Link href="/dashboard/clients" />}>
                <ArrowLeft className="size-4" />
                {t("backToList")}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="columns-1 gap-6 [column-fill:balance] lg:columns-2 [&>*]:mb-6 [&>*]:break-inside-avoid">
      <ClientDetailProfileCard clientId={clientId} client={client} onSaved={reload} />

      <Card className="min-w-0">
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
                "border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[4.5rem] w-full rounded-lg border px-2.5 py-2 text-base transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
              )}
            />
          </Field>
          <Button
            type="button"
            size="sm"
            disabled={!notesDirty || savingNotes}
            onClick={() => void saveCaseDescription()}
          >
            {savingNotes ? (
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4 shrink-0" aria-hidden />
            )}
            {savingNotes ? t("caseNotes.saving") : t("caseNotes.save")}
          </Button>
        </CardContent>
      </Card>

      <ClientDetailNotesCard clientId={clientId} />

      <ClientDetailFilesCard
        clientId={clientId}
        onFilesMutated={() => setTimelineRefresh((n) => n + 1)}
      />

      {!pp ? (
        <Card className="min-w-0">
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
          <Card className="min-w-0">
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

          <ClientDetailAssigneeOverviewCard
            overview={pp.assigneeOverview}
            currentStageAssignee={pp.currentStageAssignee}
          />

          {pp.completedAt ? null : (
            <Card className="min-w-0">
              <CardHeader className="pb-3">
                <p id="next-actions-summary-desc" className="sr-only">
                  {t("nextActions.description")}
                </p>
                <div className="flex items-start justify-between gap-3">
                  <ClientDetailCardTitle icon={ClipboardList} className="min-w-0 flex-1">
                    {t("nextActions.title")}
                  </ClientDetailCardTitle>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          className="text-muted-foreground hover:bg-muted/60 hover:text-foreground mt-0.5 shrink-0 rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={t("nextActions.helpAria")}
                          aria-describedby="next-actions-summary-desc"
                        >
                          <Info className="size-4" aria-hidden />
                        </button>
                      }
                    />
                    <TooltipContent side="bottom" align="end" className="max-w-sm text-left text-sm">
                      {t("nextActions.description")}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="bg-muted/20 border-border/60 flex flex-col gap-3 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-muted-foreground text-xs font-medium">{t("journey.currentStage")}</p>
                    <p className="text-foreground truncate text-base leading-tight font-semibold">
                      {pp.currentStage?.name ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:shrink-0 sm:justify-end">
                    <SlaPill status={pp.slaStatus} label={slaLabel(pp.slaStatus)} />
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {t("journey.daysInStage", { days: pp.daysInStage })}
                    </span>
                  </div>
                </div>

                {pp.currentStage?.patientMessage?.trim() ? (
                  <div className="border-border/70 bg-muted/10 rounded-lg border px-3 py-3">
                    <p className="text-muted-foreground mb-2 text-xs font-medium">{t("nextActions.stageMessage")}</p>
                    <p className="text-foreground/95 text-sm leading-relaxed whitespace-pre-wrap">
                      {pp.currentStage.patientMessage}
                    </p>
                  </div>
                ) : null}

                {incompleteRequiredChecklist.length > 0 ? (
                  <Alert variant="destructive" className="border-destructive/40">
                    <Info className="size-4 shrink-0" aria-hidden />
                    <AlertDescription>
                      <p className="font-medium">{t("nextActions.pendingRequiredTitle")}</p>
                      <ul className="mt-2 list-inside list-disc space-y-0.5">
                        {incompleteRequiredChecklist.map((item) => (
                          <li key={item.id}>{item.label}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="border-emerald-500/25 bg-emerald-500/[0.06] flex items-start gap-2.5 rounded-lg border px-3 py-2.5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                      aria-hidden
                    />
                    <p className="text-muted-foreground text-sm leading-snug">
                      {t("nextActions.noBlockingChecklist")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="min-w-0">
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
                              {item.requiredForTransition ? (
                                <span className="text-muted-foreground ml-2 align-middle text-[10px] font-normal uppercase tracking-wide">
                                  ({t("checklist.requiredBadge")})
                                </span>
                              ) : null}
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
              <Card className="min-w-0">
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
                    size="sm"
                    onClick={() => openTransitionConfirm()}
                    disabled={submitting || nextOptions.length === 0 || !toStageId}
                  >
                    <ClipboardCheck className="size-4 shrink-0" aria-hidden />
                    {t("transition.review")}
                  </Button>
                </CardContent>
              </Card>

              <Dialog
                open={confirmOpen}
                onOpenChange={(open) => {
                  if (!submitting) {
                    setConfirmOpen(open);
                    if (!open) setOverrideReason("");
                  }
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
                    size="sm"
                    onClick={() => setConfirmOpen(false)}
                    disabled={submitting}
                  >
                    <X className="size-4 shrink-0" aria-hidden />
                    {t("transition.cancelConfirm")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void executeTransition()}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                    ) : (
                      <Check className="size-4 shrink-0" aria-hidden />
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
                {incompleteRequiredChecklist.length > 0 ? (
                  <div className="mt-4 border-t pt-3">
                    <Alert variant="destructive" className="mb-3">
                      <AlertDescription className="text-sm">
                        {t("transition.blockedByChecklist")}
                      </AlertDescription>
                    </Alert>
                    <Field>
                      <FieldLabel htmlFor="client-detail-override">{t("transition.overrideReasonLabel")}</FieldLabel>
                      <textarea
                        id="client-detail-override"
                        rows={3}
                        maxLength={2000}
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        disabled={submitting}
                        placeholder={t("transition.overrideReasonPlaceholder")}
                        className={cn(
                          "border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[4rem] w-full rounded-lg border px-2.5 py-2 text-sm transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
                        )}
                      />
                    </Field>
                    <p className="text-muted-foreground mt-1 text-xs">{t("transition.overrideReasonHint")}</p>
                  </div>
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

        </>
      )}

      <div className="mt-8 min-w-0 w-full [column-span:all]">
        <ClientDetailTimelineSection clientId={clientId} refreshSignal={timelineRefresh} />
      </div>

      <div className="min-w-0 w-full [column-span:all]">
        <ClientCompletedTreatmentsSection
          client={client}
          items={data.completedTreatments ?? []}
        />
      </div>
      </div>
    </div>
  );
}
