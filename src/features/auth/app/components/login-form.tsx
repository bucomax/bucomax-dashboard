"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Form, FormInput, FormPassword } from "@/shared/components/forms";
import { useLoginForm } from "../hooks/use-login-form";

export function LoginForm() {
  const t = useTranslations("auth");
  const { form, submitError, onSubmit } = useLoginForm();

  return (
    <div className="w-full">
      <Card className="w-full shadow-sm">
        <CardHeader>
          <CardTitle>{t("login.title")}</CardTitle>
          <CardDescription>{t("login.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={onSubmit} className="flex flex-col gap-4 pb-4">
              <FormInput name="email" label={t("login.email")} type="email" autoComplete="email" />
              <FormPassword
                name="password"
                label={t("login.password")}
                autoComplete="current-password"
              />
              {submitError ? (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                {form.formState.isSubmitting ? t("login.submitting") : t("login.submit")}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t-0 pt-0">
          <p className="text-muted-foreground text-center text-sm">
            <Link href="/auth/forgot-password" className="text-primary underline-offset-4 hover:underline">
              {t("login.forgotPassword")}
            </Link>
          </p>
          <p className="text-muted-foreground text-center text-xs">
            {t("login.devHint", {
              seedCommand: t("login.seedCommand"),
              email: t("login.seedEmail"),
            })}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
