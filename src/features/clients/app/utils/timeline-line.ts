import type { ClientTimelineItemDto } from "@/types/api/clients-v1";
import { boolField, numberField, stringArrayField, stringField } from "@/features/clients/app/utils/record-fields";
import { formatDateTime } from "@/lib/utils/date";

type TimelineTranslator = (key: string, values?: Record<string, string | number>) => string;

export function lineForItem(item: ClientTimelineItemDto, t: TimelineTranslator): { title: string; subtitle: string } {
  const createdAt = formatDateTime(item.createdAt);

  if (item.kind === "legacy_transition") {
    const from = item.fromStage?.name ?? t("history.start");
    const subtitle = [
      createdAt,
      item.actor.name ?? item.actor.email,
      item.note?.trim() || null,
      item.ruleOverrideReason
        ? t("history.overrideSummary", {
            reason: item.ruleOverrideReason,
            by: item.forcedBy?.name?.trim() || item.forcedBy?.email || "—",
          })
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return { title: `${from} → ${item.toStage.name}`, subtitle };
  }

  const actorLabel = item.actor != null ? (item.actor.name ?? item.actor.email) : t("timeline.actorPublic");

  if (item.type === "STAGE_TRANSITION") {
    const from = stringField(item.payload, "fromStageName") ?? t("history.start");
    const to = stringField(item.payload, "toStageName") ?? "—";
    const forced = item.payload.forcedOverride === true;
    const reason = stringField(item.payload, "ruleOverrideReason");
    return {
      title: `${t("timeline.audit.stageTransition")}: ${from} → ${to}`,
      subtitle: [
        createdAt,
        actorLabel,
        forced && reason
          ? t("history.overrideSummary", { reason, by: actorLabel })
          : forced
            ? t("timeline.forcedNoReason")
            : null,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  }

  if (item.type === "FILE_UPLOADED_TO_CLIENT") {
    const id = stringField(item.payload, "fileAssetId") ?? "—";
    return {
      title: t("timeline.audit.fileUpload"),
      subtitle: [createdAt, actorLabel, t("timeline.audit.fileMeta", { id })].join(" · "),
    };
  }

  if (item.type === "PATIENT_PORTAL_FILE_SUBMITTED") {
    const id = stringField(item.payload, "fileAssetId") ?? "—";
    return {
      title: t("timeline.audit.portalFileSubmitted"),
      subtitle: [createdAt, t("timeline.actorPublic"), t("timeline.audit.fileMeta", { id })].join(" · "),
    };
  }

  if (item.type === "PATIENT_PORTAL_FILE_APPROVED") {
    const id = stringField(item.payload, "fileAssetId") ?? "—";
    return {
      title: t("timeline.audit.portalFileApproved"),
      subtitle: [createdAt, actorLabel, t("timeline.audit.fileMeta", { id })].join(" · "),
    };
  }

  if (item.type === "PATIENT_PORTAL_FILE_REJECTED") {
    const id = stringField(item.payload, "fileAssetId") ?? "—";
    const reason = stringField(item.payload, "rejectReason");
    return {
      title: t("timeline.audit.portalFileRejected"),
      subtitle: [createdAt, actorLabel, t("timeline.audit.fileMeta", { id }), reason ?? null]
        .filter(Boolean)
        .join(" · "),
    };
  }

  if (item.type === "SELF_REGISTER_COMPLETED") {
    const mode = item.payload.mode === "update" ? "update" : "create";
    const title = mode === "update" ? t("timeline.audit.selfRegisterUpdate") : t("timeline.audit.selfRegister");
    return {
      title,
      subtitle: [createdAt, t("timeline.actorPublic")].join(" · "),
    };
  }

  if (item.type === "PATIENT_PORTAL_PASSWORD_SET") {
    return {
      title: t("timeline.audit.portalPasswordSet"),
      subtitle: [createdAt, t("timeline.actorPublic")].join(" · "),
    };
  }

  if (item.type === "PATIENT_PORTAL_SESSION_CREATED") {
    const method = stringField(item.payload, "method");
    const methodLabel =
      method === "magic_link"
        ? t("timeline.audit.portalSessionMethod.magic_link")
        : method === "otp"
          ? t("timeline.audit.portalSessionMethod.otp")
          : method === "password"
            ? t("timeline.audit.portalSessionMethod.password")
            : method ?? "—";
    return {
      title: t("timeline.audit.portalSessionCreated"),
      subtitle: [createdAt, t("timeline.actorPublic"), methodLabel].join(" · "),
    };
  }

  if (item.type === "PATIENT_PORTAL_LINK_GENERATED") {
    const single = boolField(item.payload, "singleUse");
    const mode =
      single === true
        ? t("timeline.audit.portalLinkSingleUse")
        : single === false
          ? t("timeline.audit.portalLinkMultiUse")
          : null;
    return {
      title: t("timeline.audit.portalLinkGenerated"),
      subtitle: [createdAt, actorLabel, mode].filter(Boolean).join(" · "),
    };
  }

  if (item.type === "PATIENT_CREATED") {
    return {
      title: t("timeline.audit.patientCreated"),
      subtitle: [createdAt, actorLabel].join(" · "),
    };
  }

  if (item.type === "PATIENT_UPDATED") {
    const fields = stringArrayField(item.payload, "changedFields");
    const fieldsLabel = fields.length > 0 ? t("timeline.audit.changedFields", { fields: fields.join(", ") }) : null;
    return {
      title: t("timeline.audit.patientUpdated"),
      subtitle: [createdAt, actorLabel, fieldsLabel].filter(Boolean).join(" · "),
    };
  }

  if (item.type === "PATIENT_DELETED") {
    return {
      title: t("timeline.audit.patientDeleted"),
      subtitle: [createdAt, actorLabel].join(" · "),
    };
  }

  if (item.type === "PATIENT_PATHWAY_STARTED") {
    const pathwayId = stringField(item.payload, "pathwayId") ?? "—";
    return {
      title: t("timeline.audit.pathwayStarted"),
      subtitle: [createdAt, actorLabel, pathwayId].join(" · "),
    };
  }

  if (item.type === "PATIENT_PATHWAY_COMPLETED") {
    const patientPathwayId = stringField(item.payload, "patientPathwayId") ?? "—";
    return {
      title: t("timeline.audit.pathwayCompleted"),
      subtitle: [createdAt, actorLabel, patientPathwayId].join(" · "),
    };
  }

  if (item.type === "FILE_DOWNLOADED_BY_STAFF") {
    const id = stringField(item.payload, "fileAssetId") ?? "—";
    return {
      title: t("timeline.audit.fileDownloadedStaff"),
      subtitle: [createdAt, actorLabel, id].join(" · "),
    };
  }

  if (item.type === "FILE_DOWNLOADED_BY_PATIENT") {
    const id = stringField(item.payload, "fileAssetId") ?? "—";
    return {
      title: t("timeline.audit.fileDownloadedPatient"),
      subtitle: [createdAt, t("timeline.actorPublic"), id].join(" · "),
    };
  }

  if (item.type === "CHECKLIST_ITEM_TOGGLED") {
    const itemId = stringField(item.payload, "itemId") ?? "—";
    const checked = boolField(item.payload, "checked");
    const state =
      checked === true
        ? t("timeline.audit.checklistChecked")
        : checked === false
          ? t("timeline.audit.checklistUnchecked")
          : null;
    return {
      title: t("timeline.audit.checklistItemToggled"),
      subtitle: [createdAt, actorLabel, itemId, state].filter(Boolean).join(" · "),
    };
  }

  if (item.type === "FILE_DELETED") {
    const id = stringField(item.payload, "fileAssetId") ?? "—";
    return {
      title: t("timeline.audit.fileDeleted"),
      subtitle: [createdAt, actorLabel, id].join(" · "),
    };
  }

  if (item.type === "PATIENT_PORTAL_LOGIN_FAILED") {
    const reason = stringField(item.payload, "reason");
    const reasonLabel =
      reason === "invalid_password"
        ? t("timeline.audit.portalLoginFailedReason.invalidPassword")
        : reason === "password_not_set"
          ? t("timeline.audit.portalLoginFailedReason.passwordNotSet")
          : reason ?? "—";
    return {
      title: t("timeline.audit.portalLoginFailed"),
      subtitle: [createdAt, t("timeline.actorPublic"), reasonLabel].join(" · "),
    };
  }

  if (item.type === "PATIENT_CONSENT_GIVEN") {
    const consentType = stringField(item.payload, "consentType");
    const version = stringField(item.payload, "version") ?? "—";
    const kindLabel =
      consentType === "terms"
        ? t("timeline.audit.consentKind.terms")
        : consentType === "lgpd"
          ? t("timeline.audit.consentKind.lgpd")
          : consentType ?? "—";
    return {
      title: t("timeline.audit.consentGiven"),
      subtitle: [createdAt, t("timeline.actorPublic"), kindLabel, version].join(" · "),
    };
  }

  if (item.type === "AUDIT_EXPORT_GENERATED") {
    const count = numberField(item.payload, "rowCount");
    return {
      title: t("timeline.audit.auditExportGenerated"),
      subtitle: [createdAt, actorLabel, count != null ? t("timeline.audit.auditExportMeta", { count }) : null]
        .filter(Boolean)
        .join(" · "),
    };
  }

  if (item.type === "WHATSAPP_DISPATCH_QUEUED") {
    const fileName = stringField(item.payload, "documentFileName");
    return {
      title: t("timeline.audit.whatsappDispatchQueued"),
      subtitle: [createdAt, actorLabel, fileName].filter(Boolean).join(" · "),
    };
  }

  if (item.type === "WHATSAPP_DISPATCH_SENT") {
    const fileName = stringField(item.payload, "documentFileName");
    return {
      title: t("timeline.audit.whatsappDispatchSent"),
      subtitle: [createdAt, actorLabel, fileName].filter(Boolean).join(" · "),
    };
  }

  if (item.type === "WHATSAPP_DISPATCH_DELIVERED") {
    return {
      title: t("timeline.audit.whatsappDispatchDelivered"),
      subtitle: [createdAt, actorLabel].join(" · "),
    };
  }

  if (item.type === "WHATSAPP_DISPATCH_READ") {
    return {
      title: t("timeline.audit.whatsappDispatchRead"),
      subtitle: [createdAt, actorLabel].join(" · "),
    };
  }

  if (item.type === "WHATSAPP_DISPATCH_FAILED") {
    const fileName = stringField(item.payload, "documentFileName");
    const errorDetail = stringField(item.payload, "errorDetail");
    return {
      title: t("timeline.audit.whatsappDispatchFailed"),
      subtitle: [createdAt, actorLabel, fileName, errorDetail].filter(Boolean).join(" · "),
    };
  }

  if (item.type === "WHATSAPP_PATIENT_CONFIRMED") {
    return {
      title: t("timeline.audit.whatsappPatientConfirmed"),
      subtitle: [createdAt, t("timeline.actorPublic")].join(" · "),
    };
  }

  return {
    title: item.type,
    subtitle: createdAt,
  };
}
