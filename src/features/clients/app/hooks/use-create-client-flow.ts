"use client";

import { useCallback, useState } from "react";

import {
  createClient,
  createPatientPathway,
} from "@/features/clients/app/services/clients.service";
import type { CreateClientRequestBody } from "@/types/api/clients-v1";

type CreateClientFlowInput = {
  payload: CreateClientRequestBody;
  pathwayId: string;
};

export function useCreateClientFlow() {
  const [submitting, setSubmitting] = useState(false);

  const submitClientFlow = useCallback(async (input: CreateClientFlowInput) => {
    const { payload, pathwayId } = input;

    setSubmitting(true);
    try {
      const client = await createClient(payload);

      await createPatientPathway({ clientId: client.id, pathwayId });
      return client;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return {
    submitting,
    submitClientFlow,
  };
}
