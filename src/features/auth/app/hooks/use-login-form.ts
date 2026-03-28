"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { LoginFormValues } from "../types/auth";
import { loginSchema } from "../utils/schemas";

function normalizeCallbackPath(input: string | null, fallback: string) {
  if (!input) return fallback;

  let path = input;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const u = new URL(path);
      path = `${u.pathname}${u.search}${u.hash}`;
    } catch {
      return fallback;
    }
  }

  for (const locale of routing.locales) {
    const prefix = `/${locale}`;
    if (path === prefix) return "/";
    if (path.startsWith(`${prefix}/`)) {
      return path.slice(prefix.length) || "/";
    }
  }

  return path.startsWith("/") ? path : fallback;
}

export function useLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultCallback = "/dashboard";
  const callbackUrl = normalizeCallbackPath(searchParams.get("callbackUrl"), defaultCallback);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null);
    const res = await signIn("credentials", {
      email: values.email.trim().toLowerCase(),
      password: values.password,
      redirect: false,
      callbackUrl,
    });

    if (res?.error) {
      setSubmitError(t("login.invalidCredentials"));
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return {
    form,
    submitError,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
