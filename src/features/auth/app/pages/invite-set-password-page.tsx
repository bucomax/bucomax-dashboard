import { Suspense } from "react";
import { AuthPageShell } from "../components/auth-page-shell";
import { AuthSuspenseFallback } from "../components/auth-suspense-fallback";
import { SetPasswordForm } from "../components/set-password-form";

export function InviteSetPasswordPage() {
  return (
    <AuthPageShell>
      <Suspense fallback={<AuthSuspenseFallback />}>
        <SetPasswordForm
          title="Definir senha"
          subtitle="Você foi convidado para o iDoctor. Crie sua senha para continuar."
        />
      </Suspense>
    </AuthPageShell>
  );
}
