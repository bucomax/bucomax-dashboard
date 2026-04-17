import { relativeTimeLabel } from "@/lib/utils/date";
import { useLocale } from "next-intl";
import { useMemo } from "react";

export function useRelativeTime(dateStr: string): string {
  const locale = useLocale();

  return useMemo(() => {
    const intlLocale = locale === "en" ? "en-US" : "pt-BR";
    return relativeTimeLabel(dateStr, intlLocale);
  }, [dateStr, locale]);
}
