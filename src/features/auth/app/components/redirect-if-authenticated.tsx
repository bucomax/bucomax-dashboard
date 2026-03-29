"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

/**
 * Evita redirect no servidor em /login: em produção, RSC pode “ver” sessão e mandar para
 * /dashboard enquanto o cookie ainda não acompanha o fetch RSC seguinte — loop 307.
 * Com navegação só no cliente após `useSession` estável, o browser envia cookies de forma consistente.
 */
export function RedirectIfAuthenticated({ to = "/dashboard" }: { to?: string }) {
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      window.location.replace(to);
    }
  }, [status, to]);

  return null;
}
