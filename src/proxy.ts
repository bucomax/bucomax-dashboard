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
    callbacks: { authorized: ({ token }) => !!token },
    pages: { signIn: "/login" },
  },
);

const PUBLIC_PAGES = ["/", "/login", "/auth/forgot-password", "/auth/reset-password", "/auth/invite"];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isPublic) return intlMiddleware(req);
  return (authMiddleware as unknown as (req: NextRequest) => Response)(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
