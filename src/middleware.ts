import { routing } from "@/i18n/routing";
import createMiddleware from "next-intl/middleware";
import { withAuth } from "next-auth/middleware";

const intlMiddleware = createMiddleware(routing);

export default withAuth(
  function onSuccess(req) {
    return intlMiddleware(req);
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        const isDashboard = pathname.includes("/dashboard");
        if (isDashboard) {
          return !!token;
        }
        return true;
      },
    },
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
