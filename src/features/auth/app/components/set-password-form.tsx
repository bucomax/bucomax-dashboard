"use client";

import { Form, FormPassword } from "@/components/forms";
import { useSetPasswordForm } from "../hooks/use-set-password-form";

export type SetPasswordFormProps = {
  title: string;
  subtitle?: string;
};

/**
 * Formulário de nova senha (reset por email ou convite admin).
 * Lógica em `useSetPasswordForm`; API em `services/password.service`.
 */
export function SetPasswordForm({ title, subtitle }: SetPasswordFormProps) {
  const { form, done, onSubmit, isSubmitting } = useSetPasswordForm();

  if (done) {
    return (
      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        {subtitle ?? "Senha salva."} Redirecionando para o login…
      </p>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle ? <p className="text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p> : null}
        <FormPassword name="newPassword" label="Nova senha" autoComplete="new-password" />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {isSubmitting ? "Salvando…" : "Salvar senha"}
        </button>
      </form>
    </Form>
  );
}
