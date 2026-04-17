import { parsePortalLoginInput } from "@/domain/auth/patient-portal-login-identifier";
import { formatCpfDisplay } from "@/lib/validators/cpf";

export function formatLoginDisplay(login: string): string {
  const parsed = parsePortalLoginInput(login);

  if (!parsed) {
    return login.trim();
  }

  if (parsed.kind === "cpf") {
    return formatCpfDisplay(parsed.cpf11);
  }

  return parsed.emailNorm;
}
