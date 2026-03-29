import { LocaleSwitcher } from "@/shared/components/layout/locale-switcher";
import type { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
};

/**
 * Layout compartilhado das rotas públicas de autenticação (`(auth)`):
 * fundo com gradiente leve, troca de idioma fixa no canto, coluna central.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-muted/50 via-background to-background dark:from-zinc-950/80 dark:via-background dark:to-zinc-950">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-25"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(ellipse 120% 80% at 50% -30%, oklch(0.55 0.12 250 / 0.18), transparent 55%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.12]"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='1' cy='1' r='1' fill='currentColor'/%3E%3C/svg%3E")`,
        }}
      />
      <LocaleSwitcher variant="floating" />
      <main className="relative z-0 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        {children}
      </main>
    </div>
  );
}
