import { createApiMeta } from "@/lib/api/envelope";
import { clearPatientPortalSessionCookie } from "@/lib/auth/patient-portal-session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({
    success: true,
    data: { ok: true },
    meta: createApiMeta(),
  });
  clearPatientPortalSessionCookie(res);
  return res;
}
