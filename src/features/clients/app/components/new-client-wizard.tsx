"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Form, FormInput, FormTextarea } from "@/shared/components/forms";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Field, FieldDescription, FieldLabel } from "@/shared/components/ui/field";
import {
  createClient,
  createPatientPathway,
  listPathwaysForTenant,
} from "@/features/clients/app/services/clients.service";
import type { PathwayOption } from "@/features/clients/app/types/api";
import { newClientFormSchema, type NewClientFormValues } from "@/features/clients/app/utils/schemas";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

type Step = 1 | 2 | 3;

export function NewClientWizard() {
  const t = useTranslations("clients.wizard");
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [pathwayId, setPathwayId] = useState<string | null>(null);
  const [pathways, setPathways] = useState<PathwayOption[] | null>(null);
  const [pathwaysLoading, setPathwaysLoading] = useState(false);
  const [pathwaysError, setPathwaysError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<NewClientFormValues>({
    resolver: zodResolver(newClientFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      caseDescription: "",
      documentId: "",
    },
  });

  const eligiblePathways = useMemo(
    () => (pathways ?? []).filter((p) => p.publishedVersion != null),
    [pathways],
  );

  const loadPathways = useCallback(async () => {
    setPathwaysLoading(true);
    setPathwaysError(null);
    try {
      const list = await listPathwaysForTenant();
      setPathways(list);
    } catch (e) {
      setPathwaysError(e instanceof Error ? e.message : t("errorGeneric"));
      setPathways([]);
    } finally {
      setPathwaysLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (step !== 2) return;
    void loadPathways();
  }, [step, loadPathways]);

  const selectedPathway = useMemo(
    () => eligiblePathways.find((p) => p.id === pathwayId) ?? null,
    [eligiblePathways, pathwayId],
  );

  function goBack() {
    if (step === 1) return;
    if (step === 2) {
      setStep(1);
      return;
    }
    setStep(2);
  }

  function goNextFromStep1() {
    void form.handleSubmit(() => setStep(2))();
  }

  function goNextFromStep2() {
    if (!pathwayId) {
      toast.error(t("pathwayPlaceholder"));
      return;
    }
    setStep(3);
  }

  async function handleSubmitAll() {
    const values = form.getValues();
    setSubmitting(true);
    try {
      const client = await createClient({
        name: values.name.trim(),
        phone: values.phone.trim(),
        caseDescription: values.caseDescription?.trim() || undefined,
        documentId: values.documentId?.trim() || undefined,
      });
      if (!pathwayId) {
        toast.error(t("errorGeneric"));
        return;
      }
      await createPatientPathway({ clientId: client.id, pathwayId });
      toast.success(t("success"));
      router.push("/dashboard/clients");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  const stepClass = (n: Step) =>
    cn(
      "flex size-8 items-center justify-center rounded-full text-sm font-medium",
      step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
    );

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <div className={stepClass(1)}>1</div>
          <span className="text-muted-foreground hidden sm:inline">—</span>
          <div className={stepClass(2)}>2</div>
          <span className="text-muted-foreground hidden sm:inline">—</span>
          <div className={stepClass(3)}>3</div>
        </div>
        <CardTitle className="sr-only">{t("title")}</CardTitle>
        <CardDescription className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-xs">
          <span className={step === 1 ? "text-foreground font-medium" : ""}>{t("step1")}</span>
          <span className={step === 2 ? "text-foreground font-medium" : ""}>{t("step2")}</span>
          <span className={step === 3 ? "text-foreground font-medium" : ""}>{t("step3")}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          {step === 1 ? (
            <div className="flex flex-col gap-4">
              <FormInput name="name" label={t("name")} autoComplete="name" />
              <FormInput name="phone" label={t("phone")} type="tel" autoComplete="tel" />
              <FormTextarea
                name="caseDescription"
                label={t("caseDescription")}
                description={t("caseDescriptionHint")}
                rows={4}
              />
              <FormInput name="documentId" label={t("documentId")} description={t("documentIdHint")} />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              {pathwaysLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  {t("pathwayLoading")}
                </div>
              ) : null}
              {pathwaysError ? (
                <p className="text-destructive text-sm">{pathwaysError}</p>
              ) : null}
              {!pathwaysLoading && eligiblePathways.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("pathwayEmpty")}</p>
              ) : null}
              {!pathwaysLoading && eligiblePathways.length > 0 ? (
                <Field>
                  <FieldLabel>{t("pathwayLabel")}</FieldLabel>
                  <FieldDescription>{t("pathwayHelp")}</FieldDescription>
                  <Select
                    value={pathwayId ?? undefined}
                    onValueChange={(v) => setPathwayId(v ?? null)}
                  >
                    <SelectTrigger className="w-full max-w-md" size="default">
                      <SelectValue placeholder={t("pathwayPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {eligiblePathways.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                          {p.publishedVersion ? ` · v${p.publishedVersion.version}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3 text-sm">
              <p className="font-medium">{t("reviewTitle")}</p>
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">{t("reviewName")}</dt>
                  <dd>{form.getValues("name")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("reviewPhone")}</dt>
                  <dd>{form.getValues("phone")}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">{t("reviewPathway")}</dt>
                  <dd>{selectedPathway?.name ?? "—"}</dd>
                </div>
                {selectedPathway?.publishedVersion ? (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">{t("reviewVersion")}</dt>
                    <dd>v{selectedPathway.publishedVersion.version}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
        </Form>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t pt-0">
        {step > 1 ? (
          <Button type="button" variant="outline" onClick={goBack} disabled={submitting}>
            {t("back")}
          </Button>
        ) : null}
        {step === 1 ? (
          <Button type="button" onClick={goNextFromStep1}>
            {t("next")}
          </Button>
        ) : null}
        {step === 2 ? (
          <Button type="button" onClick={goNextFromStep2} disabled={eligiblePathways.length === 0}>
            {t("next")}
          </Button>
        ) : null}
        {step === 3 ? (
          <Button type="button" onClick={() => void handleSubmitAll()} disabled={submitting}>
            {submitting ? t("submitting") : t("submit")}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
