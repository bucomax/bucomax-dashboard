import type { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
};

/**
 * Layout compartilhado das rotas públicas de autenticação (`(auth)`):
 * coluna central, largura máxima, altura mínima da viewport.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">{children}</main>
    </div>
  );
}
