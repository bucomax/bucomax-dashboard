import { LoginPage } from "@/features/auth/app/pages/login-page";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await getSession();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return <LoginPage />;
}
