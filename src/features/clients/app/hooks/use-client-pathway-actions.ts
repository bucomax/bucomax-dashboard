"use client";

import { useCallback, useState } from "react";

import {
  togglePatientChecklistItem,
  transitionPatientStage,
} from "@/features/pathways/app/services/patient-pathways.service";

export function useClientPathwayActions() {
  const [transitioning, setTransitioning] = useState(false);
  const [updatingChecklistItemId, setUpdatingChecklistItemId] = useState<string | null>(null);

  const transitionClientStage = useCallback(
    async (
      patientPathwayId: string,
      input: { toStageId: string; note?: string },
    ) => {
      setTransitioning(true);
      try {
        await transitionPatientStage(patientPathwayId, input);
      } finally {
        setTransitioning(false);
      }
    },
    [],
  );

  const toggleChecklistItem = useCallback(
    async (patientPathwayId: string, checklistItemId: string, completed: boolean) => {
      setUpdatingChecklistItemId(checklistItemId);
      try {
        await togglePatientChecklistItem(patientPathwayId, checklistItemId, { completed });
      } finally {
        setUpdatingChecklistItemId(null);
      }
    },
    [],
  );

  return {
    transitioning,
    updatingChecklistItemId,
    transitionClientStage,
    toggleChecklistItem,
  };
}
