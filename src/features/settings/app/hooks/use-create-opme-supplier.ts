"use client";

import { useCallback, useState } from "react";

import { createOpmeSupplier } from "@/features/settings/app/services/tenant-settings.service";

export function useCreateOpmeSupplier() {
  const [creating, setCreating] = useState(false);

  const submitCreateOpmeSupplier = useCallback(async (name: string) => {
    setCreating(true);
    try {
      return await createOpmeSupplier(name);
    } finally {
      setCreating(false);
    }
  }, []);

  return {
    creating,
    submitCreateOpmeSupplier,
  };
}
