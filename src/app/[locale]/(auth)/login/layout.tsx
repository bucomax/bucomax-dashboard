import { AuthLayout } from "@/shared/components/layout/auth-layout";
import type { ReactNode } from "react";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
