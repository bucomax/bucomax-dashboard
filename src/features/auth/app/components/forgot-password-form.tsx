"use client";

import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Form, FormInput } from "@/shared/components/forms";
import { useForgotPasswordForm } from "../hooks/use-forgot-password-form";

export function ForgotPasswordForm() {
  const { form, message, apiError, onSubmit } = useForgotPasswordForm();

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 pb-4">
        <FormInput name="email" label="Email" type="email" autoComplete="email" />
        {apiError ? (
          <Alert variant="destructive">
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        ) : null}
        {message ? (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? "Enviandoâ€¦" : "Enviar link"}
        </Button>
      </form>
    </Form>
  );
}
