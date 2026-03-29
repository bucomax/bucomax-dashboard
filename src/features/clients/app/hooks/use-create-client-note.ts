"use client";

import { useCallback, useState } from "react";

import { createClientNote } from "@/features/clients/app/services/client-notes.service";

export function useCreateClientNote() {
  const [creating, setCreating] = useState(false);

  const createNote = useCallback(
    async (clientId: string, content: string) => {
      setCreating(true);
      try {
        await createClientNote(clientId, { content });
      } finally {
        setCreating(false);
      }
    },
    [],
  );

  return {
    creating,
    createNote,
  };
}
