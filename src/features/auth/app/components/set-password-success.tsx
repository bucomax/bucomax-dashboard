"use client";

import { Button } from "@/shared/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const REDIRECT_SECONDS = 5;

type SetPasswordSuccessProps = {
  /** Mensagem principal (ex.: convite vs reset). */
  message?: string;
  redirectTo?: string;
};

export function SetPasswordSuccess({ message, redirectTo = "/login" }: SetPasswordSuccessProps) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (seconds === 0) {
      router.push(redirectTo);
      return;
    }
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [seconds, router, redirectTo]);

  return (
    <div
      className="border-primary/25 bg-primary/5 flex flex-col items-center rounded-xl border px-4 py-8 text-center shadow-sm sm:px-8"
      role="status"
    >
      <div
        className="bg-primary/10 text-primary mb-4 flex size-16 items-center justify-center rounded-full"
        aria-hidden
      >
        <CheckCircle2 className="size-9" />
      </div>
      <h2 className="text-foreground text-xl font-semibold tracking-tight">Tudo certo</h2>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
        {message ?? "Sua senha foi salva com sucesso."}
      </p>
      <p className="text-muted-foreground mt-8 text-sm">Redirecionando para o login em</p>
      <div
        className="border-primary/35 text-primary bg-background mt-3 flex size-20 items-center justify-center rounded-full border-2 text-4xl font-semibold tabular-nums shadow-inner"
        aria-live="polite"
        aria-atomic="true"
        aria-label={`${seconds} segundos restantes`}
      >
        {seconds}
      </div>
      <p className="text-muted-foreground mt-1 text-xs">segundos</p>
      <Button
        type="button"
        variant="secondary"
        className="mt-8 w-full max-w-xs"
        onClick={() => router.push(redirectTo)}
      >
        Ir para o login agora
      </Button>
    </div>
  );
}
