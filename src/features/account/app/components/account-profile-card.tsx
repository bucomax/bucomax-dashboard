"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { getMe, patchMe } from "@/features/account/app/services/profile.service";
import { profileFormSchema, type ProfileFormValues } from "@/features/account/app/utils/schemas";
import { toast } from "@/lib/toast";
import { Form, FormInput } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

export function AccountProfileCard() {
  const t = useTranslations("account.profile");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: "", image: "" },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await getMe();
      setEmail(me.email);
      form.reset({
        name: me.name ?? "",
        image: me.image ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [form, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(values: ProfileFormValues) {
    try {
      await patchMe({
        name: values.name.trim(),
        image: values.image === undefined || values.image.trim() === "" ? null : values.image.trim(),
      });
      toast.success(t("success"));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("loadError"));
    }
  }

  if (loading && email === null && !error) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-destructive text-sm">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            {t("retry")}
          </Button>
        </CardContent>
      </Card>
    );
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
            <Field>
              <FieldLabel htmlFor="account-email">{t("email")}</FieldLabel>
              <Input id="account-email" readOnly value={email ?? ""} className="bg-muted/50" />
            </Field>
            <FormInput name="name" label={t("name")} autoComplete="name" />
            <FormInput
              name="image"
              label={t("image")}
              description={t("imageHint")}
              type="url"
              autoComplete="off"
              placeholder="https://"
            />
          </CardContent>
          <CardFooter className="justify-end border-t pt-4 mt-6">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("save")}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
