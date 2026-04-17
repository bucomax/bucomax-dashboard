"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getPatientPathway,
  transitionPatientStage,
} from "@/features/pathways/app/services/patient-pathways.service";
import type {
  PatientPathwayDetail,
  TransitionPatientStageInput,
} from "@/features/pathways/app/types/patient-pathways";
import { useTranslations } from "next-intl";

export function usePatientPathway(patientPathwayId: string) {
  const t = useTranslations("pathways.patient");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<PatientPathwayDetail | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = await getPatientPathway(patientPathwayId);
      setData(row);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [patientPathwayId, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function submitTransition(input: TransitionPatientStageInput) {
    setSubmitting(true);
    try {
      await transitionPatientStage(patientPathwayId, input);
      await reload();
    } finally {
      setSubmitting(false);
    }
  }

  const nextOptions = useMemo(() => {
    if (!data?.pathwayVersion?.stages?.length) return [];
    const currentStageId = data.currentStage?.id;
    return data.pathwayVersion.stages.filter((stage) => stage.id !== currentStageId);
  }, [data]);

  return {
    data,
    loading,
    error,
    submitting,
    reload,
    submitTransition,
    nextOptions,
  };
}
