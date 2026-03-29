import { RedirectIfAuthenticated } from "@/features/auth/app/components/redirect-if-authenticated";
import { LoginPage } from "@/features/auth/app/pages/login-page";

export default function Page() {
  return (
    <>
      <RedirectIfAuthenticated />
      <LoginPage />
    </>
  );
}
