import { Link } from "@/i18n/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "../components/forgot-password-form";

export async function ForgotPasswordPage() {
  const t = await getTranslations("auth.forgotPassword");

  return (
    <>
      <Card className="w-full shadow-sm">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-center text-sm">
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </>
  );
}
