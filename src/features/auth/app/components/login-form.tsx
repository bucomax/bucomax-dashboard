"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Informe a senha"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function defaultDashboardPath(locale: string) {
  return locale === routing.defaultLocale ? "/dashboard" : `/${locale}/dashboard`;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("auth");
  const defaultCallback = defaultDashboardPath(locale);
  const callbackUrl = searchParams.get("callbackUrl") ?? defaultCallback;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null);
    const res = await signIn("credentials", {
      email: values.email.trim().toLowerCase(),
      password: values.password,
      redirect: false,
      callbackUrl,
    });
    if (res?.error) {
      setSubmitError(t("login.invalidCredentials"));
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="w-full">
      <Card className="w-full shadow-sm">
        <CardHeader>
          <CardTitle>{t("login.title")}</CardTitle>
          <CardDescription>{t("login.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
