"use client";

import { AuthSuspenseFallback } from "@/features/auth/app/components/auth-suspense-fallback";
import { translatedZodResolver } from "@/features/clients/app/utils/translated-zod-resolver";
import {
  patientSelfRegisterFormSchema,
  type PatientSelfRegisterFormValues,
} from "@/features/clients/app/utils/schemas";
import type { PublicPatientSelfRegisterFormPrefillDto } from "@/types/api/clients-v1";
import { joinTranslatedZodIssues } from "@/lib/api/zod-i18n";
import { syncMaskedFormFieldsFromDom } from "@/lib/utils/sync-masked-form-fields-from-dom";
import { publicPatientSelfRegisterBodySchema } from "@/lib/validators/client";
import { digitsOnlyCep } from "@/lib/validators/cep";
import { digitsOnlyCpf } from "@/lib/validators/cpf";
import { digitsOnlyPhone } from "@/lib/validators/phone";
import {
  fetchPatientSelfRegisterValidation,
  submitPatientSelfRegister,
} from "@/lib/api/patient-self-register-public";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Form, FormCep, FormCpf, FormInput, FormPhoneNumber, FormTextarea } from "@/shared/components/forms";
import { useTranslations } from "next-intl";
import type { FormEvent } from "react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch, type FieldErrors } from "react-hook-form";
import { useParams, useSearchParams } from "next/navigation";

type Phase = "loading" | "invalid" | "form" | "success";

function collectRhfErrorMessages(errors: FieldErrors): string[] {
  const out: string[] = [];
  function walk(node: unknown): void {
    if (node == null || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    if (typeof o.message === "string" && o.message.trim()) {
      out.push(o.message);
      return;
    }
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) {
        for (const item of v) walk(item);
      } else if (v && typeof v === "object") {
        walk(v);
      }
    }
  }
  walk(errors);
  return [...new Set(out)];
}

function scrollFirstInvalidFieldIntoView(): void {
  requestAnimationFrame(() => {
    const el =
      document.querySelector<HTMLElement>('[data-slot="field"][data-invalid]') ??
      document.querySelector<HTMLElement>('[aria-invalid="true"]');
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

function PatientSelfRegisterInner() {
  const t = useTranslations("clients.selfRegister");
  const tWiz = useTranslations("clients.wizard");
  const tGlobal = useTranslations("global");
  const tApi = useTranslations("api");
  const params = useParams();
  const tenantSlug = typeof params.tenantSlug === "string" ? params.tenantSlug : undefined;
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("loading");
  const [token, setToken] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const [tenantName, setTenantName] = useState<string>("");
  const [formPrefill, setFormPrefill] = useState<PublicPatientSelfRegisterFormPrefillDto | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const resolver = useMemo(
    () =>
      translatedZodResolver<PatientSelfRegisterFormValues>(patientSelfRegisterFormSchema, (key) =>
        tApi(key as Parameters<typeof tApi>[0]),
      ),
    [tApi],
  );

  const form = useForm<PatientSelfRegisterFormValues>({
    resolver,
    shouldFocusError: true,
    defaultValues: {
      name: "",
      phone: "",
      caseDescription: "",
      documentId: "",
      email: "",
      isMinor: false,
      guardianName: "",
      guardianDocumentId: "",
      guardianPhone: "",
      postalCode: "",
      addressLine: "",
      addressNumber: "",
      addressComp: "",
      neighborhood: "",
      city: "",
      state: "",
    },
  });

  const isMinorWatched = useWatch({ control: form.control, name: "isMinor" });

  useEffect(() => {
    const raw = searchParams.get("token")?.trim() ?? "";
    if (!raw) {
      tokenRef.current = null;
      setFormPrefill(null);
      setPhase("invalid");
      return;
    }
    let cancelled = false;
    void fetchPatientSelfRegisterValidation(raw, tenantSlug).then((r) => {
      if (cancelled) return;
      if (!r.valid) {
        tokenRef.current = null;
        setFormPrefill(null);
        setPhase("invalid");
        return;
      }
      setToken(raw);
      tokenRef.current = raw;
      setTenantName(r.tenantName ?? "");
      setFormPrefill(r.formPrefill ?? null);
      setPhase("form");
    });
    return () => {
      cancelled = true;
    };
  }, [searchParams, tenantSlug]);

  const { reset } = form;

  useEffect(() => {
    if (phase !== "form" || !formPrefill) return;
    reset({
      name: formPrefill.name,
      phone: formPrefill.phone,
      email: formPrefill.email ?? "",
      documentId: formPrefill.documentId ?? "",
      caseDescription: formPrefill.caseDescription ?? "",
      isMinor: formPrefill.isMinor,
      guardianName: formPrefill.guardianName ?? "",
      guardianDocumentId: formPrefill.guardianDocumentId ?? "",
      guardianPhone: formPrefill.guardianPhone ?? "",
      postalCode: formPrefill.postalCode ?? "",
      addressLine: formPrefill.addressLine ?? "",
      addressNumber: formPrefill.addressNumber ?? "",
      addressComp: formPrefill.addressComp ?? "",
      neighborhood: formPrefill.neighborhood ?? "",
      city: formPrefill.city ?? "",
      state: formPrefill.state ?? "",
    });
  }, [phase, formPrefill, reset]);

  async function onSubmit(values: PatientSelfRegisterFormValues) {
    const submitToken = tokenRef.current;
    if (!submitToken) {
      const msg = t("invalidTokenBody");
      setSubmitError(msg);
      toast.error(msg, { description: t("invalidTokenTitle") });
      return;
    }
    setSubmitError(null);
    const parsed = patientSelfRegisterFormSchema.safeParse(values);
    if (!parsed.success) {
      const msg = joinTranslatedZodIssues(parsed.error, tApi as (key: string) => string);
      setSubmitError(msg);
      toast.error(t("submitFailedTitle"), { description: msg });
      return;
    }
    const requestBody = { ...parsed.data, token: submitToken };
    const apiParsed = publicPatientSelfRegisterBodySchema.safeParse(requestBody);
    if (!apiParsed.success) {
      const msg = joinTranslatedZodIssues(apiParsed.error, tApi as (key: string) => string);
      setSubmitError(msg);
      toast.error(t("submitFailedTitle"), { description: msg });
      return;
    }
    let result: Awaited<ReturnType<typeof submitPatientSelfRegister>>;
    try {
      result = await submitPatientSelfRegister(requestBody, tenantSlug);
    } catch {
      const msg = t("submitNetworkError");
      setSubmitError(msg);
      toast.error(t("submitFailedTitle"), { description: msg });
      return;
    }
    if (!result.ok) {
      setSubmitError(result.message);
      toast.error(t("submitFailedTitle"), { description: result.message });
      return;
    }
    setPhase("success");
  }

  function onValidationFailed(errors: FieldErrors<PatientSelfRegisterFormValues>) {
    const messages = collectRhfErrorMessages(errors);
    const description =
      messages.length > 0 ? messages.slice(0, 4).join(" · ") : t("fixFieldsHint");
    setSubmitError(description);
    toast.error(t("submitFailedTitle"), { description });
    scrollFirstInvalidFieldIntoView();
  }

  function handlePatientFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    syncMaskedFormFieldsFromDom(e.currentTarget, form.setValue, [
      { name: "phone", normalize: digitsOnlyPhone },
      { name: "guardianPhone", normalize: digitsOnlyPhone },
      { name: "documentId", normalize: digitsOnlyCpf },
      { name: "guardianDocumentId", normalize: digitsOnlyCpf },
      { name: "postalCode", normalize: digitsOnlyCep },
    ]);
    void form.handleSubmit(onSubmit, onValidationFailed)(e);
  }

  return (
    <div className="w-full">
      <header className="mb-8 text-center">
        <Link href="/" className="group inline-flex flex-col items-center gap-1">
          <span className="text-2xl font-semibold tracking-tight transition-opacity group-hover:opacity-80">
            {tGlobal("brand")}
          </span>
          <span className="text-muted-foreground text-sm">{t("pageDescription")}</span>
        </Link>
      </header>

      {phase === "loading" ? (
        <Card className="w-full border shadow-xl shadow-black/5 dark:shadow-black/20">
          <CardHeader className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-full max-w-sm" />
            <p className="text-muted-foreground text-sm">{t("validating")}</p>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : null}

      {phase === "invalid" ? (
        <Card className="w-full border shadow-xl shadow-black/5 dark:shadow-black/20">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-xl">{t("invalidTokenTitle")}</CardTitle>
            <CardDescription>{t("invalidTokenBody")}</CardDescription>
          </CardHeader>
          <CardFooter className="border-border/60 border-t bg-muted/35 pt-4 dark:bg-muted/20">
            <Button nativeButton={false} variant="outline" className="w-full" render={<Link href="/login" />}>
              {tGlobal("home.login")}
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {phase === "form" ? (
        <Card className="@container/patient-register w-full border shadow-xl shadow-black/5 dark:shadow-black/20">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">{t("pageTitle")}</CardTitle>
            <CardDescription className="space-y-2">
              <span className="block">
                {tenantName ? t("registeringAs", { clinic: tenantName }) : t("pageDescription")}
              </span>
              {formPrefill ? <span className="text-muted-foreground block text-sm">{t("scopedFormHint")}</span> : null}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                data-testid="patient-self-register-form"
                data-e2e-token-ready={token ? "true" : "false"}
                noValidate
                onSubmit={handlePatientFormSubmit}
                className="flex flex-col gap-4 pb-2"
              >
                <div className="bg-muted/40 space-y-4 rounded-lg border p-4">
                  <p className="text-sm font-medium">{tWiz("patientSection")}</p>
                  <div className="grid grid-cols-1 gap-4 @min-[40rem]/patient-register:grid-cols-3">
                    <div className="min-w-0">
                      <FormInput name="name" label={tWiz("name")} autoComplete="name" />
                    </div>
                    <div className="min-w-0">
                      <FormPhoneNumber
                        name="phone"
                        label={tWiz("phone")}
                        description={tWiz("phoneHint")}
                        autoComplete="tel"
                      />
                    </div>
                    <div className="min-w-0">
                      <FormInput
                        name="email"
                        label={tWiz("email")}
                        description={tWiz("emailHint")}
                        type="email"
                        autoComplete="email"
                      />
                    </div>
                  </div>
                  <FormCpf
                    name="documentId"
                    label={isMinorWatched ? tWiz("documentIdMinor") : tWiz("documentId")}
                    description={isMinorWatched ? tWiz("documentIdMinorHint") : tWiz("documentIdHint")}
                  />
                  <Controller
                    name="isMinor"
                    control={form.control}
                    render={({ field }) => (
                      <label className="border-border bg-background/60 flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="mt-0.5 size-4"
                        />
                        <span className="min-w-0">{tWiz("isMinor")}</span>
                      </label>
                    )}
                  />
                </div>
                {isMinorWatched ? (
                  <div className="bg-muted/40 space-y-4 rounded-lg border p-4">
                    <p className="text-sm font-medium">{tWiz("guardianSection")}</p>
                    <div className="grid grid-cols-1 gap-4 @min-[40rem]/patient-register:grid-cols-3">
                      <div className="min-w-0">
                        <FormInput name="guardianName" label={tWiz("guardianName")} autoComplete="name" />
                      </div>
                      <div className="min-w-0">
                        <FormCpf name="guardianDocumentId" label={tWiz("guardianDocumentId")} />
                      </div>
                      <div className="min-w-0">
                        <FormPhoneNumber name="guardianPhone" label={tWiz("guardianPhone")} />
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="bg-muted/40 space-y-4 rounded-lg border p-4">
                  <p className="text-sm font-medium">{tWiz("addressSection")}</p>
                  <div className="grid grid-cols-1 gap-4 @min-[30rem]/patient-register:grid-cols-2">
                    <div className="min-w-0">
                      <FormCep name="postalCode" label={tWiz("postalCode")} description={tWiz("postalCodeHint")} />
                    </div>
                    <div className="min-w-0">
                      <FormInput name="addressLine" label={tWiz("addressLine")} autoComplete="street-address" />
                    </div>
                    <div className="min-w-0">
                      <FormInput name="addressNumber" label={tWiz("addressNumber")} />
                    </div>
                    <div className="min-w-0">
                      <FormInput name="addressComp" label={tWiz("addressComp")} />
                    </div>
                    <div className="min-w-0">
                      <FormInput name="neighborhood" label={tWiz("neighborhood")} />
                    </div>
                    <div className="min-w-0">
                      <FormInput name="city" label={tWiz("city")} autoComplete="address-level2" />
                    </div>
                    <div className="min-w-0">
                      <FormInput name="state" label={tWiz("state")} maxLength={2} className="uppercase" />
                    </div>
                  </div>
                </div>
                <FormTextarea
                  name="caseDescription"
                  label={tWiz("caseDescription")}
                  description={tWiz("caseDescriptionHint")}
                  rows={3}
                />
                {submitError ? (
                  <Alert variant="destructive">
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                ) : null}
                {/*
                  `<button type="submit">` nativo (não o `Button` Base UI) para o POST do formulário
                  disparar de forma confiável no browser + E2E.
                */}
                <button
                  type="submit"
                  data-testid="patient-self-register-submit"
                  disabled={form.formState.isSubmitting}
                  className={cn(buttonVariants({ variant: "default", size: "default" }), "w-full")}
                >
                  {form.formState.isSubmitting ? t("submitting") : t("submit")}
                </button>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : null}

      {phase === "success" ? (
        <Card
          data-testid="patient-self-register-success"
          className="w-full border shadow-xl shadow-black/5 dark:shadow-black/20"
        >
          <CardHeader className="space-y-3 pb-2">
            <CardTitle className="text-xl">{t("successTitle")}</CardTitle>
            <CardDescription className="space-y-3 text-base">
              <span className="block">{t("successBody")}</span>
              <span className="text-foreground block text-sm leading-relaxed">{t("successContactHint")}</span>
            </CardDescription>
          </CardHeader>
          <CardFooter className="border-border/60 justify-center border-t bg-muted/35 pt-4 dark:bg-muted/20">
            <p className="text-muted-foreground text-center text-sm">{t("pageDescription")}</p>
          </CardFooter>
        </Card>
      ) : null}
    </div>
  );
}

export function PatientSelfRegisterPage() {
  return (
    <Suspense fallback={<AuthSuspenseFallback />}>
      <PatientSelfRegisterInner />
    </Suspense>
  );
}
