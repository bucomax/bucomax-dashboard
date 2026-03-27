"use client";

import { Form, FormInput } from "@/components/forms";
import { useForgotPasswordForm } from "../hooks/use-forgot-password-form";

export function ForgotPasswordForm() {
  const { form, message, apiError, onSubmit } = useForgotPasswordForm();

  return (
    <>
      <h1 className="mb-2 text-xl font-semibold">Esqueci a senha</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Informe seu email. Se existir um cadastro com senha, enviaremos um link de redefinição.
      </p>
      <Form {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormInput name="email" label="Email" type="email" autoComplete="email" />
          {apiError ? <p className="text-sm text-red-600">{apiError}</p> : null}
          {message ? <p className="text-sm text-green-700 dark:text-green-400">{message}</p> : null}
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {form.formState.isSubmitting ? "Enviando…" : "Enviar link"}
          </button>
        </form>
      </Form>
    </>
  );
}
