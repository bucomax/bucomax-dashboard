"use client";

import { postPathway } from "@/features/pathways/app/services/pathways.service";
import type { CreatePathwayInput, CreatedPathway } from "@/features/pathways/types/pathways";
import { useState } from "react";

export function useCreatePathway() {
  const [creating, setCreating] = useState(false);

  async function createPathway(input: CreatePathwayInput): Promise<CreatedPathway> {
    setCreating(true);
    try {
      return await postPathway(input);
    } finally {
      setCreating(false);
    }
  }

  return {
    creating,
    createPathway,
  };
}
