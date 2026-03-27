"use client";

import {
  getPatientPathway,
  transitionPatientStage,
} from "@/features/pathways/app/services/patient-pathways.service";
import { toast } from "@/lib/toast";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
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
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

type PatientPathwayPanelProps = {
  patientPathwayId: string;
};

export function PatientPathwayPanel({ patientPathwayId }: PatientPathwayPanelProps) {
  const t = useTranslations("pathways.patient");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toStageId, setToStageId] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof getPatientPathway>> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = await getPatientPathway(patientPathwayId);
      setData(row);
      setToStageId("");
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [patientPathwayId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const nextOptions = useMemo(() => {
    if (!data?.pathwayVersion?.stages?.length) return [];
    const cur = data.currentStage?.id;
    return data.pathwayVersion.stages.filter((s) => s.id !== cur);
  }, [data]);

  async function handleSubmit() {
    if (!toStageId) {
      toast.error(t("toStagePlaceholder"));
      return;
    }
    if (toStageId === data?.currentStage?.id) {
      toast.error(t("sameStage"));
      return;
    }
    setSubmitting(true);
    try {
      await transitionPatientStage(patientPathwayId, {
        toStageId,
        note: note.trim() || undefined,
      });
      toast.success(t("success"));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("loadError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !data && !error) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-destructive text-sm">{error ?? t("loadError")}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <span className="text-muted-foreground">{t("client")}: </span>
          <span className="font-medium">{data.client.name}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{t("pathway")}: </span>
          <span className="font-medium">{data.pathway.name}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{t("currentStage")}: </span>
          <span className="font-medium">{data.currentStage?.name ?? "—"}</span>
        </div>
        <Field>
          <FieldLabel>{t("toStage")}</FieldLabel>
          <Select value={toStageId || undefined} onValueChange={(v) => setToStageId(v ?? "")}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder={t("toStagePlaceholder")} />
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
          <FieldLabel htmlFor="transition-note">{t("note")}</FieldLabel>
          <Input
            id="transition-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="—"
          />
        </Field>
      </CardContent>
      <CardFooter className="justify-end border-t">
        <Button type="button" onClick={() => void handleSubmit()} disabled={submitting || nextOptions.length === 0}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("submit")}
        </Button>
      </CardFooter>
    </Card>
  );
}
