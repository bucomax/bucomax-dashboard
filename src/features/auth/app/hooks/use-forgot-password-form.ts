"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { requestForgotPassword } from "../services/forgot-password.service";
import type { ForgotPasswordFormValues } from "../types/auth";
import { forgotPasswordSchema } from "../utils/schemas";

export function useForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setApiError(null);
    setMessage(null);
    const result = await requestForgotPassword(values.email.trim());
    if (!result.ok) {
      setApiError(result.message);
      return;
    }
    setMessage(result.message);
  }

  return {
    form,
    message,
    apiError,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
