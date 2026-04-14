import { getTranslations, setRequestLocale } from "next-intl/server";

type LegalDocumentViewProps = {
  locale: string;
  document: "terms" | "privacy";
  version: string;
};

export async function LegalDocumentView({ locale, document, version }: LegalDocumentViewProps) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal" });
  const title = t(`${document}.pageTitle`);
  const meta = t(`${document}.meta`, { version });
  const paragraphs = t.raw(`${document}.paragraphs`) as string[];
  const hint = t("common.closeTabHint");

  return (
    <main className="bg-background text-foreground min-h-svh px-4 py-10">
      <article className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">{meta}</p>
        </header>
        <div className="space-y-4 text-sm leading-relaxed">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <p className="text-muted-foreground border-border mt-10 border-t pt-6 text-xs leading-relaxed">{hint}</p>
      </article>
    </main>
  );
}
