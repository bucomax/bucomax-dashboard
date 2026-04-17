"use client";

import { usePatientPortalTenantSlug } from "@/features/patient-portal/app/context/patient-portal-tenant-context";
import {
  fetchPatientPortalLoginOptions,
  requestPatientPortalOtp,
  verifyPatientPortalOtp,
  verifyPatientPortalPassword,
} from "@/lib/api/patient-portal-client";
import { formatLoginDisplay } from "@/features/patient-portal/app/utils/login-display";
import { parsePortalLoginInput } from "@/lib/patient-portal/login-identifier";
import { digitsOnlyCpf, formatCpfDisplay } from "@/lib/validators/cpf";
import { Link, useRouter } from "@/i18n/navigation";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  HeartPulse,
  Info,
  KeyRound,
  Link2,
  Loader2,
  LockOpen,
  Send,
} from "lucide-react";

type Step = "identifier" | "password" | "sendOtp" | "code";

export function PatientPortalLoginPage() {
  const tenantSlug = usePatientPortalTenantSlug();
  const t = useTranslations("patientPortal");
  const router = useRouter();
  const [loginInput, setLoginInput] = useState("");
  /** Valor confirmado após o passo inicial (CPF ou e-mail), usado nas chamadas à API. */
  const [committedLogin, setCommittedLogin] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("identifier");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [postOtpRedirect, setPostOtpRedirect] = useState<string | null>(null);

  const trimmed = loginInput.trim();
  const identifierOk = Boolean(parsePortalLoginInput(trimmed));

  function onIdentifierChange(raw: string) {
    if (raw.includes("@")) {
      setLoginInput(raw);
    } else {
      setLoginInput(digitsOnlyCpf(raw));
    }
  }

  async function onContinueFromIdentifier() {
    setError(null);
    setInfo(null);
    if (!identifierOk) {
      setError(t("login.identifierInvalid"));
      return;
    }
    const login = trimmed;
    setLoading(true);
    try {
      const { hasPassword } = await fetchPatientPortalLoginOptions(tenantSlug, login);
      setCommittedLogin(login);
      setPassword("");
      if (hasPassword) {
        setStep("password");
      } else {
        setPostOtpRedirect(`/${tenantSlug}/patient`);
        setStep("sendOtp");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("login.optionsFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function onPasswordLogin() {
    setError(null);
    setInfo(null);
    if (!password.trim()) {
      setError(t("login.passwordRequired"));
      return;
    }
    setLoading(true);
    try {
      await verifyPatientPortalPassword(tenantSlug, committedLogin, password);
      router.replace(`/${tenantSlug}/patient`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("login.passwordFailed"));
    } finally {
      setLoading(false);
    }
  }

  function onForgotPassword() {
    setError(null);
    setInfo(null);
    setPassword("");
    setCode("");
    setPostOtpRedirect(`/${tenantSlug}/patient/set-password`);
    setStep("sendOtp");
  }

  async function onRequestCode() {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await requestPatientPortalOtp(tenantSlug, committedLogin);
      setInfo(t("login.codeSent"));
      setStep("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("login.requestFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp() {
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError(t("login.codeInvalid"));
      return;
    }
    setLoading(true);
    try {
      await verifyPatientPortalOtp(tenantSlug, committedLogin, code.trim());
      const dest = postOtpRedirect ?? `/${tenantSlug}/patient`;
      router.replace(dest);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("login.verifyFailed"));
    } finally {
      setLoading(false);
    }
  }

  function goBackToIdentifier() {
    setError(null);
    setInfo(null);
    setPassword("");
    setCode("");
    setCommittedLogin("");
    setPostOtpRedirect(null);
    setStep("identifier");
  }

  const identifierFieldValue = loginInput.includes("@") ? loginInput : formatCpfDisplay(loginInput);

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

      {step === "identifier" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="portal-login">{t("login.identifierLabel")}</Label>
            <Input
              id="portal-login"
              inputMode={loginInput.includes("@") ? "email" : "numeric"}
              autoComplete="username"
              value={identifierFieldValue}
              onChange={(e) => onIdentifierChange(e.target.value)}
              placeholder={t("login.identifierPlaceholder")}
            />
            <p className="text-muted-foreground text-xs leading-relaxed">{t("login.identifierHint")}</p>
          </div>
          <Button
            type="button"
            className="w-full gap-2"
            disabled={loading || !identifierOk}
            onClick={() => void onContinueFromIdentifier()}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <KeyRound className="size-4 shrink-0" aria-hidden />
            )}
            {loading ? t("login.loadingOptions") : t("login.continue")}
          </Button>
        </div>
      ) : null}

      {step === "password" ? (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {t("login.passwordHint", { account: formatLoginDisplay(committedLogin) })}
          </p>
          <div className="space-y-2">
            <Label htmlFor="portal-password">{t("login.passwordLabel")}</Label>
            <Input
              id="portal-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            type="button"
            className="w-full gap-2"
            disabled={loading || !password.trim()}
            onClick={() => void onPasswordLogin()}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <LockOpen className="size-4 shrink-0" aria-hidden />
            )}
            {loading ? t("login.verifying") : t("login.enterWithPassword")}
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" className="gap-1.5" disabled={loading} onClick={goBackToIdentifier}>
              <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
              {t("login.back")}
            </Button>
            <Button type="button" variant="link" size="sm" className="h-auto p-0" disabled={loading} onClick={onForgotPassword}>
              {t("login.forgotPassword")}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "sendOtp" ? (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {t("login.sendOtpHint", { account: formatLoginDisplay(committedLogin) })}
          </p>
          <Button type="button" className="w-full gap-2" disabled={loading} onClick={() => void onRequestCode()}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="size-4 shrink-0" aria-hidden />
            )}
            {loading ? t("login.sending") : t("login.sendCode")}
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={loading} onClick={goBackToIdentifier}>
            <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
            {t("login.back")}
          </Button>
        </div>
      ) : null}

      {step === "code" ? (
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
              onClick={() => {
                setCode("");
                setStep("sendOtp");
              }}
            >
              <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
              {t("login.back")}
            </Button>
            <Button
              type="button"
              className="min-w-0 flex-1 gap-2 sm:flex-initial"
              disabled={loading || code.length !== 6}
              onClick={() => void onVerifyOtp()}
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
      ) : null}

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
