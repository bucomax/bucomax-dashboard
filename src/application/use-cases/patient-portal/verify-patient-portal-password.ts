import bcrypt from "bcryptjs";
import { PATIENT_PORTAL_SESSION_MAX_AGE_SEC } from "@/lib/constants/patient-portal";
import {
  portalPasswordVersionMs,
  type PatientPortalSessionPayload,
} from "@/lib/auth/patient-portal-session";
import { findClientForPortalLogin } from "@/application/use-cases/client/find-client-for-portal-login";
import type { ParsedPortalLogin } from "@/domain/auth/patient-portal-login-identifier";
import type { PortalClientForLogin } from "@/types/api/patient-portal-v1";

export type VerifyPatientPortalPasswordResult =
  | { ok: true; sessionPayload: PatientPortalSessionPayload }
  | {
      ok: false;
      reason: "client_not_found" | "password_not_set" | "invalid_password";
      /** Definido quando o cliente existe (para auditoria de falha). */
      client?: PortalClientForLogin;
    };

export async function runVerifyPatientPortalPassword(params: {
  tenant: { id: string; slug: string };
  identifier: ParsedPortalLogin;
  password: string;
}): Promise<VerifyPatientPortalPasswordResult> {
  const { tenant, identifier, password } = params;

  const client = await findClientForPortalLogin(tenant.id, identifier);
  if (!client) {
    return { ok: false, reason: "client_not_found" };
  }

  if (!client.portalPasswordHash) {
    return { ok: false, reason: "password_not_set", client };
  }

  const match = await bcrypt.compare(password, client.portalPasswordHash);
  if (!match) {
    return { ok: false, reason: "invalid_password", client };
  }

  const exp = Math.floor(Date.now() / 1000) + PATIENT_PORTAL_SESSION_MAX_AGE_SEC;
  const sessionPayload: PatientPortalSessionPayload = {
    clientId: client.id,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    exp,
    pwdv: portalPasswordVersionMs(client.portalPasswordChangedAt),
  };

  return { ok: true, sessionPayload };
}
