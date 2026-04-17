export type ParsedPortalLogin =
  | { kind: "cpf"; cpf11: string }
  | { kind: "email"; emailNorm: string };

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parsePortalLoginInput(raw: string): ParsedPortalLogin | null {
  const input = raw.trim();
  if (!input) return null;

  if (input.includes("@")) {
    const email = input.toLowerCase();
    if (!isLikelyEmail(email)) return null;
    return { kind: "email", emailNorm: email };
  }

  const cpf = digitsOnly(input);
  if (cpf.length !== 11) return null;
  return { kind: "cpf", cpf11: cpf };
}

export function portalLoginRateKey(parsed: ParsedPortalLogin): string {
  return parsed.kind === "cpf" ? `cpf:${parsed.cpf11}` : `em:${parsed.emailNorm}`;
}
