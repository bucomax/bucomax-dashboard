import type { ReactNode } from "react";

type AuthPageShellProps = {
  children: ReactNode;
};

/** Layout comum das telas públicas de autenticação (largura máxima, centralizado). */
export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <main className="mx-auto flex min-h-full max-w-sm flex-col justify-center px-4 py-16">{children}</main>
  );
}
