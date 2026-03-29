import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/shared/components/layout/locale-switcher";
import { getTranslations } from "next-intl/server";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "global" });

  return (
    <>
      <LocaleSwitcher variant="floating" />
      <main className="relative flex min-h-dvh flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
        <div className="flex max-w-lg flex-col items-center gap-3 text-center">
          <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">{t("brand")}</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("home.title")}</h1>
          <p className="text-muted-foreground max-w-md leading-relaxed">{t("home.subtitle")}</p>
          <p className="text-muted-foreground text-sm">{t("home.loginHint")}</p>
        </div>
        <nav>
          <Link
            href="/login"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex rounded-full px-6 py-2.5 text-sm font-medium shadow-sm transition-colors"
          >
            {t("home.login")}
          </Link>
        </nav>
      </main>
    </>
  );
}
