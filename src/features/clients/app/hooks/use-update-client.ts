"use client";

import { useCallback, useState } from "react";

import { updateClient } from "@/features/clients/app/services/clients.service";
import type { PatchClientRequestBody } from "@/types/api/clients-v1";

export function useUpdateClient() {
  const [updating, setUpdating] = useState(false);

  const updateClientById = useCallback(
    async (clientId: string, body: PatchClientRequestBody) => {
      setUpdating(true);
      try {
        return await updateClient(clientId, body);
      } finally {
        setUpdating(false);
      }
    },
    [],
  );

  return {
    updating,
    updateClientById,
  };
}
