"use client";

import { usePatientPortalTenantSlug } from "@/features/patient-portal/app/context/patient-portal-tenant-context";
import {
  requestPatientPortalOtp,
  verifyPatientPortalOtp,
} from "@/lib/api/patient-portal-client";
import { digitsOnlyCpf, formatCpfDisplay } from "@/lib/validators/cpf";
import { Link, useRouter } from "@/i18n/navigation";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AlertCircle, ArrowLeft, HeartPulse, Info, Link2, Loader2, LockOpen, Send } from "lucide-react";

export function PatientPortalCpfLoginPage() {
  const tenantSlug = usePatientPortalTenantSlug();
  const t = useTranslations("patientPortal");
  const router = useRouter();
  const [cpfDigits, setCpfDigits] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"cpf" | "code">("cpf");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const cpfOk = digitsOnlyCpf(cpfDigits).length === 11;

  async function onRequestCode() {
    setError(null);
    setInfo(null);
    if (!cpfOk) {
      setError(t("login.cpfInvalid"));
      return;
    }
    setLoading(true);
    try {
      await requestPatientPortalOtp(tenantSlug, digitsOnlyCpf(cpfDigits));
      setInfo(t("login.codeSent"));
      setStep("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("login.requestFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function onVerify() {
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError(t("login.codeInvalid"));
      return;
    }
    setLoading(true);
    try {
      await verifyPatientPortalOtp(tenantSlug, digitsOnlyCpf(cpfDigits), code.trim());
      router.replace(`/${tenantSlug}/patient`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("login.verifyFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8">
      <div className="space-y-2">
        <div className="text-primary flex size-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
          <HeartPulse className="size-6" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("login.title")}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{t("login.subtitle")}</p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {info ? (
        <Alert variant="info">
          <Info className="size-4 shrink-0" aria-hidden />
          <AlertDescription>{info}</AlertDescription>
        </Alert>
      ) : null}

      {step === "cpf" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="portal-cpf">{t("login.cpfLabel")}</Label>
            <Input
              id="portal-cpf"
              inputMode="numeric"
              autoComplete="off"
              value={formatCpfDisplay(cpfDigits)}
              onChange={(e) => setCpfDigits(digitsOnlyCpf(e.target.value))}
              placeholder="000.000.000-00"
            />
          </div>
          <Button
            type="button"
            className="w-full gap-2"
            disabled={loading || !cpfOk}
            onClick={() => void onRequestCode()}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="size-4 shrink-0" aria-hidden />
            )}
            {loading ? t("login.sending") : t("login.sendCode")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="portal-code">{t("login.codeLabel")}</Label>
            <Input
              id="portal-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={loading}
              onClick={() => setStep("cpf")}
            >
              <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
              {t("login.back")}
            </Button>
            <Button
              type="button"
              className="min-w-0 flex-1 gap-2 sm:flex-initial"
              disabled={loading || code.length !== 6}
              onClick={() => void onVerify()}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <LockOpen className="size-4 shrink-0" aria-hidden />
              )}
              {loading ? t("login.verifying") : t("login.enter")}
            </Button>
          </div>
        </div>
      )}

      <p className="text-muted-foreground flex justify-center text-center text-xs">
        <Link
          href={`/${tenantSlug}/patient`}
          className="text-muted-foreground inline-flex items-center gap-1.5 underline underline-offset-4 hover:text-foreground"
        >
          <Link2 className="size-3.5 shrink-0 opacity-80" aria-hidden />
          {t("login.haveLink")}
        </Link>
      </p>
    </div>
  );
}
