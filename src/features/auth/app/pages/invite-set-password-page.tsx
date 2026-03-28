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

export function InviteSetPasswordPage() {
  return (
    <Suspense fallback={<AuthSuspenseFallback />}>
      <Card className="w-full shadow-sm">
        <CardHeader>
          <CardTitle>Definir senha</CardTitle>
          <CardDescription>
            Você foi convidado para o Bucomax. Crie sua senha para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SetPasswordForm successMessage="Conta criada." />
        </CardContent>
      </Card>
    </Suspense>
  );
}
