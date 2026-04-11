import { AuthLayout } from "@/shared/components/layout/auth-layout";
import type { ReactNode } from "react";

/** Forgot password, reset password, invite — mesmo shell que login. */
export default function AuthFlowsLayout({ children }: { children: ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
