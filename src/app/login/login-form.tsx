"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormInput, FormPassword } from "@/components/forms";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Informe a senha"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [submitError, setSubmitError] = useState<string | null>(null);

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
      setSubmitError("Email ou senha inválidos.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-full max-w-sm flex-col justify-center px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Entrar — iDoctor</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormInput name="email" label="Email" type="email" autoComplete="email" />
          <FormPassword name="password" label="Senha" autoComplete="current-password" />
          {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {form.formState.isSubmitting ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </Form>
      <p className="mt-3 text-center text-sm">
        <Link href="/auth/forgot-password" className="text-blue-600 underline dark:text-blue-400">
          Esqueci minha senha
        </Link>
      </p>
      <p className="mt-6 text-xs text-zinc-500">
        Dev: após <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">npm run db:seed</code> use{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">dev@idoctor.local</code> / senha do seed.
      </p>
    </main>
  );
}
