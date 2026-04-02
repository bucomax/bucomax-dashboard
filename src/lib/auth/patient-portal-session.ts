import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  PATIENT_PORTAL_SESSION_COOKIE,
  PATIENT_PORTAL_SESSION_MAX_AGE_SEC,
} from "@/lib/constants/patient-portal";

export type PatientPortalSessionPayload = {
  clientId: string;
  tenantId: string;
  exp: number;
};

function portalSecret(): string {
  const s =
    process.env.PATIENT_PORTAL_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!s) {
    throw new Error("Defina PATIENT_PORTAL_SECRET ou NEXTAUTH_SECRET para o portal do paciente.");
  }
  return s;
}

/** Assina payload `{ clientId, tenantId, exp }` como `base64url(payload).base64url(hmac)`. */
export function signPatientPortalSessionPayload(payload: PatientPortalSessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", portalSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyPatientPortalSessionCookieValue(
  cookieValue: string | undefined,
): PatientPortalSessionPayload | null {
  if (!cookieValue) return null;
  const dot = cookieValue.indexOf(".");
  if (dot <= 0) return null;
  const body = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  if (!body || !sig) return null;

  const expected = createHmac("sha256", portalSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const o = parsed as Record<string, unknown>;
  const clientId = o.clientId;
  const tenantId = o.tenantId;
  const exp = o.exp;
  if (typeof clientId !== "string" || clientId.length === 0) return null;
  if (typeof tenantId !== "string" || tenantId.length === 0) return null;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return null;
  if (exp < Math.floor(Date.now() / 1000)) return null;

  return { clientId, tenantId, exp };
}

export async function getPatientPortalSessionFromCookies(): Promise<PatientPortalSessionPayload | null> {
  const store = await cookies();
  return verifyPatientPortalSessionCookieValue(store.get(PATIENT_PORTAL_SESSION_COOKIE)?.value);
}

export function appendPatientPortalSessionCookie(res: NextResponse, payload: PatientPortalSessionPayload): void {
  const value = signPatientPortalSessionPayload(payload);
  const maxAge = PATIENT_PORTAL_SESSION_MAX_AGE_SEC;
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set(PATIENT_PORTAL_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge,
    secure: isProd,
  });
}

export function clearPatientPortalSessionCookie(res: NextResponse): void {
  res.cookies.set(PATIENT_PORTAL_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
}
