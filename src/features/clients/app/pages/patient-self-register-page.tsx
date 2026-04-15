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
import { isPortalSelfRegisterPasswordComplete } from "@/lib/validators/patient-portal-auth";
import { digitsOnlyCep } from "@/lib/validators/cep";
import { digitsOnlyCpf } from "@/lib/validators/cpf";
import { formatBrCnpjDisplay } from "@/lib/utils/cnpj";
import { digitsOnlyPhone } from "@/lib/validators/phone";
import {
  fetchPatientSelfRegisterValidation,
  submitPatientSelfRegister,
} from "@/lib/api/patient-self-register-public";
import { ExternalLink, FileText, Loader2, ScrollText, Send, Shield } from "lucide-react";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { FullScreenLoading } from "@/shared/components/feedback/full-screen-loading";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Form,
  FormCep,
  FormCpf,
  FormInput,
  FormPassword,
  FormPhoneNumber,
  FormSelect,
  FormTextarea,
  PasswordStrengthIndicator,
} from "@/shared/components/forms";
import { useTranslations } from "next-intl";
import type { FormEvent } from "react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch, type FieldErrors } from "react-hook-form";
import { useParams, useSearchParams } from "next/navigation";
import { GuardianRelationship, PatientPreferredChannel } from "@prisma/client";

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
  const [tenantTaxId, setTenantTaxId] = useState<string | null>(null);
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
      guardianEmail: "",
      birthDate: "",
      guardianRelationship: undefined,
      emergencyContactName: "",
      emergencyContactPhone: "",
      preferredChannel: PatientPreferredChannel.none,
      postalCode: "",
      addressLine: "",
      addressNumber: "",
      addressComp: "",
      neighborhood: "",
      city: "",
      state: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
      acceptPrivacy: false,
    },
  });

  const isMinorWatched = useWatch({ control: form.control, name: "isMinor" });

  const guardianRelationshipOptions = useMemo(
    () =>
      (
        [
          [GuardianRelationship.mother, "guardianRelationship.mother"],
          [GuardianRelationship.father, "guardianRelationship.father"],
          [GuardianRelationship.legal_guardian, "guardianRelationship.legal_guardian"],
          [GuardianRelationship.other, "guardianRelationship.other"],
        ] as const
      ).map(([value, key]) => ({ value, label: tWiz(key) })),
    [tWiz],
  );

  const preferredChannelOptions = useMemo(
    () =>
      (
        [
          [PatientPreferredChannel.none, "preferredChannelOption.none"],
          [PatientPreferredChannel.email, "preferredChannelOption.email"],
          [PatientPreferredChannel.whatsapp, "preferredChannelOption.whatsapp"],
          [PatientPreferredChannel.sms, "preferredChannelOption.sms"],
        ] as const
      ).map(([value, key]) => ({ value, label: tWiz(key) })),
    [tWiz],
  );
  const passwordWatched = useWatch({ control: form.control, name: "password" }) ?? "";
  const confirmPasswordWatched = useWatch({ control: form.control, name: "confirmPassword" }) ?? "";
  const acceptTermsWatched = useWatch({ control: form.control, name: "acceptTerms" }) === true;
  const acceptPrivacyWatched = useWatch({ control: form.control, name: "acceptPrivacy" }) === true;

  const portalPasswordReady = useMemo(
    () => isPortalSelfRegisterPasswordComplete(passwordWatched, confirmPasswordWatched),
    [passwordWatched, confirmPasswordWatched],
  );

  const consentsReady = acceptTermsWatched && acceptPrivacyWatched;

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
        setTenantTaxId(null);
        setPhase("invalid");
        return;
      }
      setToken(raw);
      tokenRef.current = raw;
      setTenantName(r.tenantName ?? "");
      setTenantTaxId(r.tenantTaxId?.trim() ? r.tenantTaxId : null);
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
      guardianEmail: formPrefill.guardianEmail ?? "",
      birthDate: formPrefill.birthDate ?? "",
      guardianRelationship: formPrefill.guardianRelationship ?? undefined,
      emergencyContactName: formPrefill.emergencyContactName ?? "",
      emergencyContactPhone: formPrefill.emergencyContactPhone ?? "",
      preferredChannel: formPrefill.preferredChannel ?? PatientPreferredChannel.none,
      postalCode: formPrefill.postalCode ?? "",
      addressLine: formPrefill.addressLine ?? "",
      addressNumber: formPrefill.addressNumber ?? "",
      addressComp: formPrefill.addressComp ?? "",
      neighborhood: formPrefill.neighborhood ?? "",
      city: formPrefill.city ?? "",
      state: formPrefill.state ?? "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
      acceptPrivacy: false,
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
    const { confirmPassword: _confirmOmit, ...fields } = parsed.data;
    void _confirmOmit;
    const requestBody = { ...fields, token: submitToken };
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

      {phase === "loading" ? <FullScreenLoading message={t("validating")} showMessage={false} /> : null}

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
          <CardHeader className="space-y-4 pb-4">
            <CardTitle className="text-xl">{t("pageTitle")}</CardTitle>
            {tenantName ? (
              <div className="bg-primary/[0.07] ring-primary/15 dark:bg-primary/12 rounded-xl border border-primary/25 p-4 ring-1">
                <p className="text-muted-foreground mb-2 text-sm leading-snug">{t("registeringAsIntro")}</p>
                <p className="text-foreground text-xl font-bold leading-tight tracking-tight">{tenantName}</p>
                {tenantTaxId ? (
                  <p className="text-foreground mt-3 text-sm leading-relaxed">
                    <span className="text-muted-foreground font-medium">{t("registeringAsTaxLabel")}: </span>
                    <span className="font-bold tabular-nums">{formatBrCnpjDisplay(tenantTaxId)}</span>
                  </p>
                ) : null}
              </div>
            ) : (
              <CardDescription>{t("pageDescription")}</CardDescription>
            )}
            {formPrefill ? (
              <CardDescription className="text-muted-foreground text-sm">{t("scopedFormHint")}</CardDescription>
            ) : null}
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
                  <div className="grid grid-cols-1 gap-4 @min-[40rem]/patient-register:grid-cols-2">
                    <div className="min-w-0">
                      <FormInput
                        name="birthDate"
                        label={tWiz("birthDate")}
                        description={tWiz("birthDateHint")}
                        type="date"
                        autoComplete="bday"
                      />
                    </div>
                    <div className="min-w-0">
                      <FormSelect
                        name="preferredChannel"
                        label={tWiz("preferredChannelField")}
                        description={tWiz("preferredChannelHint")}
                        options={preferredChannelOptions}
                      />
                    </div>
                  </div>
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
                    <div className="grid grid-cols-1 gap-4 @min-[40rem]/patient-register:grid-cols-2">
                      <div className="min-w-0">
                        <FormSelect
                          name="guardianRelationship"
                          label={tWiz("guardianRelationshipLabel")}
                          description={tWiz("guardianRelationshipHint")}
                          placeholder={tWiz("guardianRelationshipPlaceholder")}
                          options={guardianRelationshipOptions}
                        />
                      </div>
                      <div className="min-w-0">
                        <FormInput
                          name="guardianEmail"
                          label={tWiz("guardianEmail")}
                          description={tWiz("guardianEmailHint")}
                          type="email"
                          autoComplete="email"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="bg-muted/40 space-y-4 rounded-lg border p-4">
                  <p className="text-sm font-medium">{tWiz("emergencySection")}</p>
                  <div className="grid grid-cols-1 gap-4 @min-[40rem]/patient-register:grid-cols-2">
                    <div className="min-w-0">
                      <FormInput name="emergencyContactName" label={tWiz("emergencyContactName")} />
                    </div>
                    <div className="min-w-0">
                      <FormPhoneNumber name="emergencyContactPhone" label={tWiz("emergencyContactPhone")} />
                    </div>
                  </div>
                </div>
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
                <div className="bg-muted/40 space-y-4 rounded-lg border p-4">
                  <div className="space-y-4">
                    <FormPassword
                      name="password"
                      label={t("passwordStrength.passwordLabel")}
                      description={t("passwordStrength.passwordHint")}
                      autoComplete="new-password"
                    />
                    <FormPassword
                      name="confirmPassword"
                      label={t("passwordStrength.confirmLabel")}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="bg-muted/30 border-border/80 space-y-3 rounded-xl border p-4 shadow-sm">
                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                      {t("passwordStrength.requirementsTitle")}
                    </p>
                    <PasswordStrengthIndicator
                      password={passwordWatched}
                      confirmPassword={confirmPasswordWatched}
                      labelsNamespace="clients.selfRegister.passwordStrength"
                      rulesTwoColumn
                      className="space-y-0"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3.5 rounded-xl border border-border/80 bg-gradient-to-br from-muted/45 via-background to-muted/30 p-4 shadow-sm ring-1 ring-black/[0.03] dark:from-muted/25 dark:via-background dark:to-muted/15 dark:ring-white/[0.04] sm:p-5">
                    <div className="bg-primary/12 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                      <ScrollText className="size-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <h3 className="text-foreground text-base font-semibold leading-snug tracking-tight">
                        {t("consent.sectionTitle")}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{t("consent.sectionDescription")}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Controller
                      name="acceptTerms"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <div
                          className={cn(
                            "group rounded-xl border bg-card/90 p-4 shadow-sm transition-[border-color,box-shadow] sm:p-5",
                            fieldState.error
                              ? "border-destructive/55 ring-2 ring-destructive/20"
                              : "border-border/90 hover:border-primary/30 focus-within:border-primary/45 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]",
                          )}
                        >
                          <label
                            htmlFor="patient-self-register-accept-terms"
                            className="flex cursor-pointer gap-3.5 sm:gap-4"
                          >
                            <input
                              id="patient-self-register-accept-terms"
                              name="acceptTerms"
                              type="checkbox"
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="border-input text-primary focus-visible:ring-ring mt-1 size-[1.125rem] shrink-0 cursor-pointer rounded border-2 accent-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                            />
                            <span className="min-w-0 flex-1 space-y-2.5">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-foreground inline-flex items-center gap-2 text-sm font-semibold">
                                  <FileText className="text-primary size-4 shrink-0" aria-hidden />
                                  {t("consent.termsShortTitle")}
                                </span>
                                <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                                  {t("consent.requiredShort")}
                                </span>
                              </span>
                              <span className="text-muted-foreground block text-sm leading-relaxed">
                                {t.rich("consent.termsRich", {
                                  terms: (chunks) => (
                                    <Link
                                      href="/legal/terms"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={t("consent.openDocumentHint")}
                                      className="text-primary inline-flex items-center gap-1.5 font-medium underline decoration-primary/35 underline-offset-[3px] transition-colors hover:decoration-primary"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {chunks}
                                      <ExternalLink className="text-primary/80 size-3.5 shrink-0" aria-hidden />
                                    </Link>
                                  ),
                                })}
                              </span>
                              {fieldState.error?.message ? (
                                <span className="text-destructive block text-sm font-medium" role="alert">
                                  {fieldState.error.message}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        </div>
                      )}
                    />
                    <Controller
                      name="acceptPrivacy"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <div
                          className={cn(
                            "group rounded-xl border bg-card/90 p-4 shadow-sm transition-[border-color,box-shadow] sm:p-5",
                            fieldState.error
                              ? "border-destructive/55 ring-2 ring-destructive/20"
                              : "border-border/90 hover:border-primary/30 focus-within:border-primary/45 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]",
                          )}
                        >
                          <label
                            htmlFor="patient-self-register-accept-privacy"
                            className="flex cursor-pointer gap-3.5 sm:gap-4"
                          >
                            <input
                              id="patient-self-register-accept-privacy"
                              name="acceptPrivacy"
                              type="checkbox"
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="border-input text-primary focus-visible:ring-ring mt-1 size-[1.125rem] shrink-0 cursor-pointer rounded border-2 accent-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                            />
                            <span className="min-w-0 flex-1 space-y-2.5">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-foreground inline-flex items-center gap-2 text-sm font-semibold">
                                  <Shield className="text-primary size-4 shrink-0" aria-hidden />
                                  {t("consent.privacyShortTitle")}
                                </span>
                                <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                                  {t("consent.requiredShort")}
                                </span>
                              </span>
                              <span className="text-muted-foreground block text-sm leading-relaxed">
                                {t.rich("consent.privacyRich", {
                                  privacy: (chunks) => (
                                    <Link
                                      href="/legal/privacy"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={t("consent.openDocumentHint")}
                                      className="text-primary inline-flex items-center gap-1.5 font-medium underline decoration-primary/35 underline-offset-[3px] transition-colors hover:decoration-primary"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {chunks}
                                      <ExternalLink className="text-primary/80 size-3.5 shrink-0" aria-hidden />
                                    </Link>
                                  ),
                                })}
                              </span>
                              {fieldState.error?.message ? (
                                <span className="text-destructive block text-sm font-medium" role="alert">
                                  {fieldState.error.message}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        </div>
                      )}
                    />
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
                  disabled={form.formState.isSubmitting || !portalPasswordReady || !consentsReady}
                  className={cn(
                    buttonVariants({ variant: "default", size: "default" }),
                    "inline-flex w-full items-center justify-center gap-2",
                  )}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                      {t("submitting")}
                    </>
                  ) : (
                    <>
                      <Send className="size-4 shrink-0" aria-hidden />
                      {t("submit")}
                    </>
                  )}
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
          <CardHeader className="space-y-4 pb-4">
            <CardTitle className="text-xl">{t("successTitle")}</CardTitle>
            <CardDescription className="space-y-4 text-base leading-relaxed">
              <span className="text-foreground block font-medium">{t("successBody")}</span>
              <span className="text-muted-foreground block text-sm leading-relaxed">{t("successContactHint")}</span>
            </CardDescription>
          </CardHeader>
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
