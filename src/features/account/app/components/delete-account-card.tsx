"use client";

import { deleteAccount } from "@/features/account/app/services/profile.service";
import { routing } from "@/i18n/routing";
import { toast } from "@/lib/toast";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

export function DeleteAccountCard() {
  const t = useTranslations("account.danger");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const loginCallback =
    locale === routing.defaultLocale ? "/login" : `/${locale}/login`;

  async function handleConfirm() {
    setPending(true);
    try {
      await deleteAccount();
      toast.success(t("success"));
      await signOut({ callbackUrl: loginCallback });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("confirm"));
    } finally {
      setPending(false);
      setOpen(false);
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-muted-foreground text-sm">{t("confirmHelp")}</p>
        {open ? (
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={() => void handleConfirm()} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("confirm")}
            </Button>
          </div>
        ) : null}
      </CardContent>
      {!open ? (
        <CardFooter className="border-t pt-4 mt-6">
          <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
            {t("openConfirm")}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
