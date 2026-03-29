"use client";

import { useCallback } from "react";

import { changePassword } from "@/features/settings/app/services/profile.service";

export function useChangePassword() {
  const submitChangePassword = useCallback(
    async (input: { currentPassword: string; newPassword: string }) => {
      await changePassword(input);
    },
    [],
  );

  return { submitChangePassword };
}
