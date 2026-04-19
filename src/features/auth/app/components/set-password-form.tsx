"use client";

import { useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { KeyRound, Loader2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Form, FormPassword } from "@/shared/components/forms";
import { PasswordStrengthIndicator } from "@/shared/components/forms/password-strength-indicator";
import { useSetPasswordForm } from "../hooks/use-set-password-form";
import type { SetPasswordFormProps } from "../types/components";
import { SetPasswordSuccess } from "./set-password-success";

export function SetPasswordForm({ successMessage, redirectTo }: SetPasswordFormProps) {
  const t = useTranslations("auth.setPassword");
  const tStrength = useTranslations("clients.selfRegister.passwordStrength");
  const { form, done, onSubmit, isSubmitting, redirectTo: redirectAfterSuccess } = useSetPasswordForm({
    redirectTo,
  });

  const newPassword = useWatch({ control: form.control, name: "newPassword" }) ?? "";
  const confirmPassword = useWatch({ control: form.control, name: "confirmPassword" }) ?? "";

  if (done) {
    return <SetPasswordSuccess message={successMessage} redirectTo={redirectAfterSuccess} />;
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 pb-4">
        <div className="bg-muted/40 space-y-4 rounded-lg border p-4">
          <div className="space-y-4">
            <FormPassword
              name="newPassword"
              label={t("newPassword")}
              autoComplete="new-password"
            />
            <FormPassword
              name="confirmPassword"
              label={t("confirmPassword")}
              autoComplete="new-password"
            />
          </div>
          <div className="bg-muted/30 border-border/80 space-y-3 rounded-xl border p-4 shadow-sm">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {tStrength("requirementsTitle")}
            </p>
            <PasswordStrengthIndicator
              password={newPassword}
              confirmPassword={confirmPassword}
              labelsNamespace="clients.selfRegister.passwordStrength"
              rulesTwoColumn
              className="space-y-0"
            />
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <KeyRound className="size-4" aria-hidden />
          )}
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
      </form>
    </Form>
  );
}
