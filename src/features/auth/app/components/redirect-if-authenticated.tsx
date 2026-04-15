"use client";

import { FullScreenLoading } from "@/shared/components/feedback/full-screen-loading";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

/**
 * Evita redirect no servidor em /login: em producao, RSC pode "ver" sessao e mandar para
 * /dashboard enquanto o cookie ainda nao acompanha o fetch RSC seguinte - loop 307.
 * Com navegacao so no cliente apos `useSession` estavel, o browser envia cookies de forma consistente.
 *
 * Quando a sessao esta expirada (ex.: DB resetado), forca signOut para limpar o cookie JWT
 * e evitar loop de redirect.
 */
export function RedirectIfAuthenticated({ to = "/dashboard" }: { to?: string }) {
  const { data: session, status } = useSession();
  const t = useTranslations("patientPortal");

  useEffect(() => {
    if (status === "authenticated") {
      const isExpired =
        session?.expires && new Date(session.expires).getTime() < Date.now();
      if (isExpired) {
        signOut({ redirect: false });
        return;
      }
      window.location.replace(to);
    }
  }, [status, session, to]);

  if (status === "loading" || status === "authenticated") {
    return <FullScreenLoading message={t("enter.validating")} showMessage={false} />;
  }

  return null;
}
