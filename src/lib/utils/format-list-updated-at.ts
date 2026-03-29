/**
 * Data/hora para listagens (ex.: coluna «Atualizado» em Pacientes).
 * pt-BR: `29/03/2026 - 10:39:40` · en: locale `en-US` com o mesmo padrão visual.
 */
export function formatListUpdatedAt(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  const intlLocale = locale === "en" ? "en-US" : "pt-BR";
  const datePart = new Intl.DateTimeFormat(intlLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
  const timePart = new Intl.DateTimeFormat(intlLocale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
  return `${datePart} - ${timePart}`;
}
