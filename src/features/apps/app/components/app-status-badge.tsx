"use client";

import { Badge } from "@/shared/components/ui/badge";
import type { TenantAppStatus } from "@/types/api/apps-v1";
import { useTranslations } from "next-intl";

type Props = {
  status: TenantAppStatus | null;
};

export function AppStatusBadge({ status }: Props) {
  const t = useTranslations("apps.card");

  if (!status) {
    return <Badge variant="outline">{t("install")}</Badge>;
  }

  switch (status) {
    case "active":
      return <Badge variant="default" className="bg-green-600 hover:bg-green-700">{t("active")}</Badge>;
    case "pending_config":
      return <Badge variant="secondary">{t("pendingConfig")}</Badge>;
    case "suspended":
      return <Badge variant="destructive">{t("suspended")}</Badge>;
    case "inactive":
      return <Badge variant="outline">{t("inactive")}</Badge>;
  }
}
