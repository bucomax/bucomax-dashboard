"use client";

import type { FieldValues, UseFormReturn } from "react-hook-form";
import { FormProvider } from "react-hook-form";

/**
 * Provider do React Hook Form. Use com `useForm` + `zodResolver`.
 *
 * @example
 * const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: {} })
 * return (
 *   <Form {...form}>
 *     <form onSubmit={form.handleSubmit(onValid)}>...</form>
 *   </Form>
 * )
 */
export function Form<T extends FieldValues>({
  children,
  ...form
}: { children: React.ReactNode } & UseFormReturn<T>) {
  return <FormProvider {...form}>{children}</FormProvider>;
}
