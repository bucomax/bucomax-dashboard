import Link from "next/link";
import { AuthPageShell } from "../components/auth-page-shell";
import { ForgotPasswordForm } from "../components/forgot-password-form";

export function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-blue-600 underline dark:text-blue-400">
          Voltar ao login
        </Link>
      </p>
    </AuthPageShell>
  );
}
