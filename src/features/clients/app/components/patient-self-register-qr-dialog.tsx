"use client";

import { createPatientSelfRegisterInvite } from "@/features/clients/app/services/clients.service";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Dialog, StandardDialogContent } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Copy, QrCode } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "@/lib/toast";

export function PatientSelfRegisterQrDialog() {
  const t = useTranslations("clients.selfRegister");
  const tList = useTranslations("clients.list");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerUrl, setRegisterUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const loadInvite = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRegisterUrl(null);
    setExpiresAt(null);
    try {
      const data = await createPatientSelfRegisterInvite();
      setRegisterUrl(data.registerUrl);
      setExpiresAt(data.expiresAt);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const onOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setLoading(false);
      setError(null);
      setRegisterUrl(null);
      setExpiresAt(null);
    }
  }, []);

  function handleOpen() {
    setOpen(true);
    void loadInvite();
  }

  const expiryLabel =
    expiresAt != null
      ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(expiresAt))
      : null;

  async function copyLink() {
    if (!registerUrl) return;
    try {
      await navigator.clipboard.writeText(registerUrl);
      toast.success(t("copied"));
    } catch {
      toast.error(t("loadError"));
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={handleOpen}>
        <QrCode className="size-4" />
        {tList("selfRegisterQr")}
      </Button>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <StandardDialogContent
          title={t("dialogTitle")}
          description={t("dialogDescription")}
          size="default"
          bodyClassName="space-y-4"
        >
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="mx-auto size-[200px] rounded-lg" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {!loading && registerUrl ? (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-xl border bg-white p-3 dark:bg-zinc-950">
                <QRCode value={registerUrl} size={200} level="M" />
              </div>
              {expiryLabel ? (
                <p className="text-muted-foreground text-center text-xs">{t("expiryHint", { date: expiryLabel })}</p>
              ) : null}
              <div className="w-full space-y-2">
                <p className="text-muted-foreground text-xs font-medium">{t("linkLabel")}</p>
                <div className="flex gap-2">
                  <Input readOnly value={registerUrl} className="min-w-0 font-mono text-xs" />
                  <Button type="button" variant="secondary" size="icon" onClick={() => void copyLink()}>
                    <Copy className="size-4" />
                    <span className="sr-only">{t("copyLink")}</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </StandardDialogContent>
      </Dialog>
    </>
  );
}
