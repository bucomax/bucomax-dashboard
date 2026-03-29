import { Suspense } from "react";
import { AuthSuspenseFallback } from "../components/auth-suspense-fallback";
import { ForgotPasswordForm } from "../components/forgot-password-form";

export function ForgotPasswordPage() {
  return (
    <Suspense fallback={<AuthSuspenseFallback />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
