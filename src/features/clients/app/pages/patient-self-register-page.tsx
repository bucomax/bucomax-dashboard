"use client";

import { AuthSuspenseFallback } from "@/features/auth/app/components/auth-suspense-fallback";
import { translatedZodResolver } from "@/features/clients/app/utils/translated-zod-resolver";
import {
  patientSelfRegisterFormSchema,
  type PatientSelfRegisterFormValues,
} from "@/features/clients/app/utils/schemas";
import type { PublicPatientSelfRegisterFormPrefillDto } from "@/types/api/clients-v1";
import { publicPatientSelfRegisterBodySchema } from "@/lib/validators/client";
import {
  fetchPatientSelfRegisterValidation,
  submitPatientSelfRegister,
} from "@/lib/api/patient-self-register-public";
import { Link } from "@/i18n/navigation";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
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
import { Suspense, useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useParams, useSearchParams } from "next/navigation";

type Phase = "loading" | "invalid" | "form" | "success";

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
      setFormPrefill(null);
      setPhase("invalid");
      return;
    }
    let cancelled = false;
    void fetchPatientSelfRegisterValidation(raw, tenantSlug).then((r) => {
      if (cancelled) return;
      if (!r.valid) {
        setFormPrefill(null);
        setPhase("invalid");
        return;
      }
      setToken(raw);
      setTenantName(r.tenantName ?? "");
      setFormPrefill(r.formPrefill ?? null);
      setPhase("form");
    });
    return () => {
      cancelled = true;
    };
  }, [searchParams, tenantSlug]);

  useEffect(() => {
    if (phase !== "form" || !formPrefill) return;
    form.reset({
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
  }, [phase, formPrefill, form]);

  async function onSubmit(values: PatientSelfRegisterFormValues) {
    if (!token) return;
    setSubmitError(null);
    const parsed = patientSelfRegisterFormSchema.safeParse(values);
    if (!parsed.success) return;
    const apiParsed = publicPatientSelfRegisterBodySchema.safeParse({ ...parsed.data, token });
    if (!apiParsed.success) return;
    const result = await submitPatientSelfRegister(apiParsed.data, tenantSlug);
    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }
    setPhase("success");
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
                onSubmit={form.handleSubmit(onSubmit)}
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
                <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                  {form.formState.isSubmitting ? t("submitting") : t("submit")}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : null}

      {phase === "success" ? (
        <Card className="w-full border shadow-xl shadow-black/5 dark:shadow-black/20">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-xl">{t("successTitle")}</CardTitle>
            <CardDescription>{t("successBody")}</CardDescription>
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
