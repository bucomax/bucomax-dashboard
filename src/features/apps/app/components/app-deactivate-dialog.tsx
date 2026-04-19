"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, X } from "lucide-react";

import { Dialog, StandardDialogContent } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appName: string;
  onConfirm: () => Promise<void>;
};

export function AppDeactivateDialog({ open, onOpenChange, appName, onConfirm }: Props) {
  const t = useTranslations("apps.detail");
  const [loading, setLoading] = useState(false);

  function handleOpenChange(next: boolean) {
    if (loading && !next) return;
    onOpenChange(next);
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {open ? (
        <StandardDialogContent
          size="sm"
          showCloseButton={!loading}
          title={t("deactivateConfirm")}
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => onOpenChange(false)}
              >
                <X className="mr-1.5 size-3.5" />
                {t("cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={loading}
                onClick={() => void handleConfirm()}
              >
                {loading && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                {t("confirm")}
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted-foreground">{t("deactivateConfirmDescription")}</p>
          <p className="mt-2 text-sm font-medium">{appName}</p>
        </StandardDialogContent>
      ) : null}
    </Dialog>
  );
}
