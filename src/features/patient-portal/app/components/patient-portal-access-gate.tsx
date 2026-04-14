"use client";

import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/lib/utils";
import { HeartPulse, IdCard, Link2, Mail, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";

type PatientPortalAccessGateProps = {
  tenantSlug: string;
};

/** Tela inicial quando o paciente ainda não tem sessão — alinhada ao fluxo de login (e-mail ou CPF). */
export function PatientPortalAccessGate({ tenantSlug }: PatientPortalAccessGateProps) {
  const t = useTranslations("patientPortal");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8">
      <div className="space-y-2">
        <div className="text-primary flex size-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
          <HeartPulse className="size-6" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("home.accessTitle")}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{t("home.accessSubtitle")}</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>{t("home.accessStepsTitle")}</CardTitle>
          <CardDescription>{t("home.accessStepsHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ul className="space-y-3.5">
            <li className="flex gap-3">
              <span
                className="bg-muted text-muted-foreground mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-border/60"
                aria-hidden
              >
                <Link2 className="size-4" />
              </span>
              <p className="text-foreground/90 text-sm leading-relaxed">{t("home.accessStepLink")}</p>
            </li>
            <li className="flex gap-3">
              <span
                className="bg-muted text-muted-foreground mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-border/60"
                aria-hidden
              >
                <div className="flex items-center gap-0.5">
                  <Mail className="size-3.5" />
                  <Smartphone className="size-3.5 -ml-0.5" />
                </div>
              </span>
              <p className="text-foreground/90 text-sm leading-relaxed">{t("home.accessStepCpf")}</p>
            </li>
          </ul>

          <Link
            href={`/${tenantSlug}/patient/login`}
            className={cn(
              buttonVariants({ variant: "default", size: "default" }),
              "h-10 w-full justify-center gap-2 text-[15px] font-medium",
            )}
          >
            <IdCard className="size-4 shrink-0" aria-hidden />
            {t("login.title")}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
