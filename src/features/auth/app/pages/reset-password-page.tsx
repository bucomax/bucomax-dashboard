import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { AuthSuspenseFallback } from "../components/auth-suspense-fallback";
import { SetPasswordForm } from "../components/set-password-form";

export function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthSuspenseFallback />}>
      <Card className="w-full shadow-sm">
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>Use a nova senha no próximo login.</CardDescription>
        </CardHeader>
        <CardContent>
          <SetPasswordForm successMessage="Senha alterada." />
        </CardContent>
      </Card>
    </Suspense>
  );
}
