import { routing } from "@/i18n/routing";
import createMiddleware from "next-intl/middleware";
import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

const authMiddleware = withAuth(
  function onSuccess(req) {
    return intlMiddleware(req);
  },
  {
    callbacks: { authorized: ({ token }) => !!token && token.invalid !== true },
    pages: { signIn: "/login" },
  },
);

const PUBLIC_PAGES = ["/", "/login", "/auth/forgot-password", "/auth/reset-password", "/auth/invite"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  /** Landing do portal (sem slug). */
  if (pathname === "/patient") {
    return true;
  }
  /** Auto-cadastro legado: `/patient-self-register?token=`. */
  if (pathname === "/patient-self-register") {
    return true;
  }
  /** `/{tenantSlug}/patient/*` — portal do paciente. */
  if (/^\/[^/]+\/patient(\/.*)?$/.test(pathname)) {
    return true;
  }
  /** `/{tenantSlug}/patient-self-register` — cadastro pelo link/QR. */
  if (/^\/[^/]+\/patient-self-register(\/.*)?$/.test(pathname)) {
    return true;
  }
  return false;
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return intlMiddleware(req);
  return (authMiddleware as unknown as (req: NextRequest) => Response)(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
