"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import {
  getPatientPathway,
  transitionPatientStage,
} from "@/features/pathways/app/services/patient-pathways.service";
import type { PatientPathwayDetail } from "@/features/pathways/types/patient-pathways";

export function usePipelineChangeStageDialog(
  patientPathwayId: string | null,
  open: boolean,
) {
  const t = useTranslations("dashboard.pipeline");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<PatientPathwayDetail | null>(null);

  const reset = useCallback(() => {
    setDetail(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!open || !patientPathwayId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const row = await getPatientPathway(patientPathwayId);
        if (!cancelled) {
          setDetail(row);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("modals.changeStage.loadError"));
          setDetail(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, patientPathwayId, t]);

  const nextOptions = useMemo(() => {
    if (!detail?.pathwayVersion?.stages?.length) return [];
    const currentStageId = detail.currentStage?.id;
    return detail.pathwayVersion.stages.filter((stage) => stage.id !== currentStageId);
  }, [detail]);

  const submitChange = useCallback(
    async (input: { toStageId: string; note?: string }) => {
      if (!patientPathwayId) return;
      setSubmitting(true);
      try {
        await transitionPatientStage(patientPathwayId, input);
      } finally {
        setSubmitting(false);
      }
    },
    [patientPathwayId],
  );

  return {
    loading,
    submitting,
    error,
    detail,
    nextOptions,
    reset,
    submitChange,
  };
}
