import { Suspense } from "react";
import { AuthSuspenseFallback } from "../components/auth-suspense-fallback";
import { LoginForm } from "../components/login-form";

export function LoginPage() {
  return (
    <Suspense fallback={<AuthSuspenseFallback />}>
      <LoginForm />
    </Suspense>
  );
}
