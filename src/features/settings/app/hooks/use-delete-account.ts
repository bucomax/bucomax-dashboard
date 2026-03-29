"use client";

import { useCallback } from "react";

import { deleteAccount } from "@/features/settings/app/services/profile.service";

export function useDeleteAccount() {
  const deleteCurrentAccount = useCallback(async () => {
    await deleteAccount();
  }, []);

  return { deleteCurrentAccount };
}
