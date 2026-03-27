import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import NextLink from "next/link";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "global" });

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">{t("home.title")}</h1>
      <p className="max-w-md text-center text-zinc-600 dark:text-zinc-400">{t("home.subtitle")}</p>
      <nav className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <Link
          href="/login"
          className="rounded-full bg-zinc-900 px-5 py-2 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          {t("home.login")}
        </Link>
        <NextLink
          href="/api-doc"
          className="rounded-full border border-zinc-300 px-5 py-2 dark:border-zinc-600"
        >
          {t("home.apiDocs")}
        </NextLink>
        <NextLink href="/api/v1/health" className="text-blue-600 underline dark:text-blue-400">
          {t("home.healthLink")}
        </NextLink>
      </nav>
    </main>
  );
}
