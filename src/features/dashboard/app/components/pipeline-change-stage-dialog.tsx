"use client";

import { usePipelineChangeStageDialog } from "@/features/dashboard/app/hooks/use-pipeline-change-stage-dialog";
import { completePatientPathway } from "@/features/pathways/app/services/patient-pathways.service";
import { toast } from "@/lib/toast";
import { Button } from "@/shared/components/ui/button";
import { Dialog, StandardDialogContent } from "@/shared/components/ui/dialog";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { CheckCircle2, Loader2, MoveRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type PipelineChangeStageDialogProps = {
  patientPathwayId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void | Promise<void>;
};

export function PipelineChangeStageDialog({
  patientPathwayId,
  open,
  onOpenChange,
  onSuccess,
}: PipelineChangeStageDialogProps) {
  const t = useTranslations("dashboard.pipeline");
  const [toStageId, setToStageId] = useState("");
  const [note, setNote] = useState("");
  const [confirmingComplete, setConfirmingComplete] = useState(false);
  const [completing, setCompleting] = useState(false);
  const {
    loading,
    submitting,
    error,
    detail,
    nextOptions,
    reset,
    submitChange,
  } = usePipelineChangeStageDialog(patientPathwayId, open);

  function resetLocal() {
    setToStageId("");
    setNote("");
    setConfirmingComplete(false);
    setCompleting(false);
    reset();
  }

  async function handleSubmit() {
    if (!patientPathwayId || !toStageId) {
      toast.error(t("modals.changeStage.pickStage"));
      return;
    }
    if (toStageId === detail?.currentStage?.id) {
      toast.error(t("modals.changeStage.sameStage"));
      return;
    }
    try {
      await submitChange({
        toStageId,
        note: note.trim() || undefined,
      });
      toast.success(t("modals.changeStage.success"));
      resetLocal();
      onOpenChange(false);
      await onSuccess();
    } catch {
      /* erro: toast global no apiClient */
    }
  }

  async function handleCompleteTreatment() {
    if (!patientPathwayId) return;
    setCompleting(true);
    try {
      await completePatientPathway(patientPathwayId);
      toast.success(t("modals.changeStage.completeSuccess"));
      resetLocal();
      onOpenChange(false);
      await onSuccess();
    } catch {
      toast.error(t("modals.changeStage.completeError"));
    } finally {
      setCompleting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      resetLocal();
    }
    onOpenChange(next);
  }

  const busy = submitting || completing;

  if (confirmingComplete) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <StandardDialogContent
          size="sm"
          showCloseButton={!busy}
          title={
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
              {t("modals.changeStage.completeConfirmTitle")}
            </span>
          }
          description={t("modals.changeStage.completeConfirmDescription")}
          bodyClassName="!max-h-0 !min-h-0 !flex-none !overflow-hidden !p-0"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirmingComplete(false)}
              >
                <X className="size-4" />
                {t("modals.changeStage.completeConfirmCancel")}
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => void handleCompleteTreatment()}
              >
                {completing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                {t("modals.changeStage.completeConfirmSubmit")}
              </Button>
            </>
          }
        >
          <div aria-hidden className="h-0" />
        </StandardDialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <StandardDialogContent
        size="sm"
        showCloseButton={!busy}
        title={
          <span className="inline-flex items-center gap-2">
            <MoveRight className="size-5 text-primary" />
            {t("modals.changeStage.title")}
          </span>
        }
        description={t("modals.changeStage.description")}
        bodyClassName="py-3"
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:border-emerald-600 sm:mr-auto"
              disabled={busy || loading || !detail}
              onClick={() => setConfirmingComplete(true)}
            >
              <CheckCircle2 className="size-4" />
              {t("modals.changeStage.completeTreatment")}
            </Button>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
              <X className="size-4" />
              {t("modals.changeStage.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={busy || loading || !detail || nextOptions.length === 0}
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <MoveRight className="size-4" />}
              {t("modals.changeStage.submit")}
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 max-w-[12rem]" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : null}

        {error && !loading ? <p className="text-destructive text-sm">{error}</p> : null}

        {detail && !loading && nextOptions.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("modals.changeStage.noOtherStages")}</p>
        ) : null}

        {detail && !loading && nextOptions.length > 0 ? (
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t("modals.changeStage.client")} </span>
              <span className="font-medium">{detail.client.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t("modals.changeStage.currentStage")} </span>
              <span className="font-medium">{detail.currentStage?.name ?? "—"}</span>
            </div>
            <Field>
              <FieldLabel>{t("modals.changeStage.targetStage")}</FieldLabel>
              <Select value={toStageId || undefined} onValueChange={(v) => setToStageId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("modals.changeStage.targetPlaceholder")} />
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
              <FieldLabel htmlFor="dash-change-stage-note">{t("modals.changeStage.note")}</FieldLabel>
              <Input
                id="dash-change-stage-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="—"
              />
            </Field>
          </div>
        ) : null}
      </StandardDialogContent>
    </Dialog>
  );
}
