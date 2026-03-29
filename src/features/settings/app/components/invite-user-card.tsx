"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAdminInvite } from "@/features/settings/app/hooks/use-admin-invite";
import { inviteUserFormSchema, type InviteUserFormValues } from "@/features/settings/app/utils/schemas";
import { toast } from "@/lib/toast";
import { Form, FormInput, FormSelect } from "@/shared/components/forms";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Loader2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

export function InviteUserCard() {
  const t = useTranslations("settings.invites");
  const { canInvite, submitInvite, sessionStatus } = useAdminInvite();

  const roleOptions = useMemo(
    () => [
      { value: "tenant_user", label: t("roleUser") },
      { value: "tenant_admin", label: t("roleAdmin") },
    ],
    [t],
  );

  const form = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserFormSchema),
    defaultValues: {
      email: "",
      name: "",
      role: "tenant_user",
    },
  });

  async function onSubmit(values: InviteUserFormValues) {
    try {
      const result = await submitInvite({
        email: values.email.trim(),
        name: values.name?.trim() || undefined,
        role: values.role,
      });
      toast.success(t("success"));
      form.reset({ email: "", name: "", role: values.role });
      if (result.email) {
        toast.message(t("sentTo", { email: result.email }));
      }
    } catch {
      /* erro: toast global no apiClient */
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
            {sessionStatus === "loading" ? (
              <Alert>
                <AlertDescription>{t("loadingSession")}</AlertDescription>
              </Alert>
            ) : null}
            {!canInvite ? (
              <Alert variant="destructive">
                <AlertDescription>{t("forbidden")}</AlertDescription>
              </Alert>
            ) : null}
            <FormInput
              name="email"
              label={t("email")}
              type="email"
              autoComplete="email"
              placeholder="profissional@empresa.com"
              disabled={!canInvite}
            />
            <FormInput
              name="name"
              label={t("name")}
              autoComplete="name"
              placeholder={t("namePlaceholder")}
              disabled={!canInvite}
            />
            <FormSelect
              name="role"
              label={t("role")}
              options={roleOptions}
              disabled={!canInvite}
            />
          </CardContent>
          <CardFooter className="justify-end border-t pt-4 mt-6">
            <Button type="submit" disabled={!canInvite || form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {t("submit")}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
