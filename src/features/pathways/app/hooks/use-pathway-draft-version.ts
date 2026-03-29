"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getPathway,
  getPathwayVersion,
  patchPathway,
  patchPathwayVersionDraft,
  postPathwayVersion,
  publishPathwayVersion,
} from "@/features/pathways/app/services/pathways.service";
import { createDefaultPathwayGraph } from "@/features/pathways/app/utils/default-graph";
import { useTranslations } from "next-intl";

export function usePathwayDraftVersion(pathwayId: string) {
  const t = useTranslations("pathways.editor");
  const [loading, setLoading] = useState(true);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [versionNumber, setVersionNumber] = useState<number | null>(null);
  const [graphJson, setGraphJson] = useState<unknown>(null);
  const [pathwayName, setPathwayName] = useState("");
  const pathwayNameBaselineRef = useRef("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pathway = await getPathway(pathwayId);
      const drafts = pathway.versions.filter((version) => !version.published).sort((a, b) => b.version - a.version);

      let nextVersionId: string;
      let nextVersionNumber: number;
      let nextGraphJson: unknown;

      if (drafts[0]) {
        nextVersionId = drafts[0].id;
        const detail = await getPathwayVersion(pathwayId, nextVersionId);
        nextVersionNumber = detail.version;
        nextGraphJson = detail.graphJson;
      } else {
        const publishedVersions = pathway.versions
          .filter((version) => version.published)
          .sort((a, b) => b.version - a.version);

        if (publishedVersions[0]) {
          const publishedDetail = await getPathwayVersion(pathwayId, publishedVersions[0].id);
          const createdVersion = await postPathwayVersion(pathwayId, publishedDetail.graphJson);
          nextVersionId = createdVersion.id;
          nextVersionNumber = createdVersion.version;
          nextGraphJson = publishedDetail.graphJson;
        } else {
          const emptyGraph = createDefaultPathwayGraph();
          const createdVersion = await postPathwayVersion(pathwayId, emptyGraph);
          nextVersionId = createdVersion.id;
          nextVersionNumber = createdVersion.version;
          nextGraphJson = emptyGraph;
        }
      }

      setVersionId(nextVersionId);
      setVersionNumber(nextVersionNumber);
      setGraphJson(nextGraphJson);
      setPathwayName(pathway.name);
      pathwayNameBaselineRef.current = pathway.name;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setVersionId(null);
      setVersionNumber(null);
      setGraphJson(null);
      setPathwayName("");
      pathwayNameBaselineRef.current = "";
    } finally {
      setLoading(false);
    }
  }, [pathwayId, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function persistPathwayNameIfChanged(): Promise<void> {
    const trimmed = pathwayName.trim();
    if (!trimmed) {
      throw new Error(t("pathwayNameRequired"));
    }
    if (trimmed === pathwayNameBaselineRef.current) return;
    await patchPathway(pathwayId, { name: trimmed });
    pathwayNameBaselineRef.current = trimmed;
    setPathwayName(trimmed);
  }

  async function saveDraft(nextGraphJson: unknown) {
    if (!versionId) return;
    setSaving(true);
    try {
      await persistPathwayNameIfChanged();
      await patchPathwayVersionDraft(pathwayId, versionId, nextGraphJson);
      setGraphJson(nextGraphJson);
    } finally {
      setSaving(false);
    }
  }

  async function publishDraft(nextGraphJson: unknown) {
    if (!versionId) return;
    setPublishing(true);
    try {
      await persistPathwayNameIfChanged();
      await patchPathwayVersionDraft(pathwayId, versionId, nextGraphJson);
      await publishPathwayVersion(pathwayId, versionId);
      await reload();
    } finally {
      setPublishing(false);
    }
  }

  return {
    loading,
    error,
    versionId,
    versionNumber,
    graphJson,
    pathwayName,
    setPathwayName,
    saving,
    publishing,
    saveDraft,
    publishDraft,
    reload,
  };
}
