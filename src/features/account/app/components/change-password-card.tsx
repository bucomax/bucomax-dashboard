"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { changePassword } from "@/features/account/app/services/profile.service";
import { changePasswordFormSchema, type ChangePasswordFormValues } from "@/features/account/app/utils/schemas";
import { toast } from "@/lib/toast";
import { Form, FormPassword } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

export function ChangePasswordCard() {
  const t = useTranslations("account.password");
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: ChangePasswordFormValues) {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success(t("success"));
      form.reset();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("hintNoPassword");
      toast.error(msg);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
          <CardContent className="space-y-4">
            <FormPassword name="currentPassword" label={t("current")} autoComplete="current-password" />
            <FormPassword name="newPassword" label={t("new")} autoComplete="new-password" />
            <FormPassword name="confirmPassword" label={t("confirm")} autoComplete="new-password" />
            <p className="text-muted-foreground text-xs">{t("hintNoPassword")}</p>
          </CardContent>
          <CardFooter className="justify-end border-t pt-6">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("submit")}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
