/**
 * URL pública da aplicação (links em e-mails, redirects).
 * Prioridade: APP_PUBLIC_URL → NEXTAUTH_URL → localhost.
 */
export function getPublicAppUrl(): string {
  const raw =
    process.env.APP_PUBLIC_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}
