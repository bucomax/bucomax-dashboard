"use client";

import { FullScreenLoading } from "@/shared/components/feedback/full-screen-loading";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

/**
 * Evita redirect no servidor em /login: em produção, RSC pode “ver” sessão e mandar para
 * /dashboard enquanto o cookie ainda não acompanha o fetch RSC seguinte — loop 307.
 * Com navegação só no cliente após `useSession` estável, o browser envia cookies de forma consistente.
 *
 * Enquanto `status` é `loading` ou `authenticated` (antes do replace), cobre a tela com o mesmo
 * texto do portal na rota /enter (`patientPortal.enter.validating`) — mesma árvore de mensagens
 * já usada no portal e evita chave em `auth` que falhava em runtime (MISSING_MESSAGE).
 */
export function RedirectIfAuthenticated({ to = "/dashboard" }: { to?: string }) {
  const { status } = useSession();
  const t = useTranslations("patientPortal");

  useEffect(() => {
    if (status === "authenticated") {
      window.location.replace(to);
    }
  }, [status, to]);

  if (status === "loading" || status === "authenticated") {
    return <FullScreenLoading message={t("enter.validating")} />;
  }

  return null;
}
