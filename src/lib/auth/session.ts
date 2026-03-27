import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth-options";

/** Sessão no servidor (Route Handlers, Server Components). */
export function getSession() {
  return getServerSession(authOptions);
}
