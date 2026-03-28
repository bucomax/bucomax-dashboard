"use client";

import { Button } from "@/shared/components/ui/button";
import { Form, FormPassword } from "@/shared/components/forms";
import { useSetPasswordForm } from "../hooks/use-set-password-form";
import type { SetPasswordFormProps } from "../types/components";
import { SetPasswordSuccess } from "./set-password-success";

export function SetPasswordForm({ successMessage, redirectTo }: SetPasswordFormProps) {
  const { form, done, onSubmit, isSubmitting, redirectTo: redirectAfterSuccess } = useSetPasswordForm({
    redirectTo,
  });

  if (done) {
    return <SetPasswordSuccess message={successMessage} redirectTo={redirectAfterSuccess} />;
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 pb-4">
        <FormPassword name="newPassword" label="Nova senha" autoComplete="new-password" />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Salvandoâ€¦" : "Salvar senha"}
        </Button>
      </form>
    </Form>
  );
}
