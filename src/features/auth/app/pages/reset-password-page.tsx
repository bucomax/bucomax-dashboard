import { Suspense } from "react";
import { AuthPageShell } from "../components/auth-page-shell";
import { AuthSuspenseFallback } from "../components/auth-suspense-fallback";
import { SetPasswordForm } from "../components/set-password-form";

export function ResetPasswordPage() {
  return (
    <AuthPageShell>
      <Suspense fallback={<AuthSuspenseFallback />}>
        <SetPasswordForm title="Redefinir senha" subtitle="Use a nova senha no próximo login." />
      </Suspense>
    </AuthPageShell>
  );
}
