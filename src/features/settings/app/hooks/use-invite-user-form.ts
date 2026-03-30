"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAdminInvite } from "@/features/settings/app/hooks/use-admin-invite";
import {
  inviteUserFormSchema,
  type InviteUserFormValues,
} from "@/features/settings/app/utils/schemas";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

export function useInviteUserForm(options?: { onSuccess?: () => void }) {
  const t = useTranslations("settings.invites");
  const onSuccess = options?.onSuccess;
  const { canInvite, submitInvite, sessionStatus } = useAdminInvite();

  const roleOptions = useMemo(
    () => [
      { value: "tenant_user" as const, label: t("roleUser") },
      { value: "tenant_admin" as const, label: t("roleAdmin") },
    ],
    [t],
  );

  const form = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserFormSchema),
    defaultValues: {
      email: "",
      name: "",
      role: "tenant_user",
    },
  });

  async function onSubmit(values: InviteUserFormValues) {
    try {
      const result = await submitInvite({
        email: values.email.trim(),
        name: values.name?.trim() || undefined,
        role: values.role,
      });
      toast.success(result.message);
      form.reset({ email: "", name: "", role: values.role });
      if (result.emailDispatched !== false && result.email) {
        toast.message(t("sentTo", { email: result.email }));
      }
      onSuccess?.();
    } catch {
      /* erro: toast global no apiClient */
    }
  }

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    canInvite,
    sessionStatus,
    roleOptions,
    t,
  };
}
