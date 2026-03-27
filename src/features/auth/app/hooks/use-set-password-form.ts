"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { resetPasswordWithToken } from "../services/password.service";
import type { SetPasswordFormValues } from "../types/auth";
import { setPasswordFormSchema } from "../utils/schemas";

export type UseSetPasswordFormOptions = {
  /** Após sucesso, redirecionar para (default `/login`). */
  redirectTo?: string;
  redirectDelayMs?: number;
};

export function useSetPasswordForm(options: UseSetPasswordFormOptions = {}) {
  const { redirectTo = "/login", redirectDelayMs = 2000 } = options;
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [done, setDone] = useState(false);

  const form = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordFormSchema),
    defaultValues: { newPassword: "" },
  });

  useEffect(() => {
    if (!token) {
      form.setError("newPassword", { message: "Token ausente na URL." });
    }
  }, [token, form]);

  async function onSubmit(values: SetPasswordFormValues) {
    if (!token) return;
    const result = await resetPasswordWithToken({
      token,
      newPassword: values.newPassword,
    });
    if (!result.ok) {
      form.setError("newPassword", { message: result.message });
      return;
    }
    setDone(true);
    setTimeout(() => router.push(redirectTo), redirectDelayMs);
  }

  return {
    form,
    done,
    tokenMissing: !token,
    onSubmit: form.handleSubmit(onSubmit),
    isSubmitting: form.formState.isSubmitting,
  };
}
