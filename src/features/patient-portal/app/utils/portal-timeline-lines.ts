import type { AuditTimelineRowModel } from "@/shared/components/timeline/audit-timeline-list";
import type { PatientPortalTimelineItemDto } from "@/types/api/patient-portal-v1";

function payloadStr(payload: Record<string, unknown>, key: string): string | undefined {
  const v = payload[key];
  return typeof v === "string" ? v : undefined;
}

/**
 * Título + linha secundária (data · ator) alinhados ao padrão do dashboard, com textos do namespace `patientPortal`.
 * Passe o `t` de `useTranslations("patientPortal")` com cast para a assinatura abaixo (limitação de tipagem do next-intl com chaves aninhadas).
 */
export function patientPortalTimelineRow(
  item: PatientPortalTimelineItemDto,
  t: (key: string, values?: Record<string, string>) => string,
  formatDateTime: (iso: string) => string,
): AuditTimelineRowModel {
  const when = formatDateTime(item.createdAt);

  function subtitleWithActor(actorLine: string | null): string {
    return [when, actorLine].filter(Boolean).join(" · ");
  }

  if (item.kind === "legacy_transition") {
    const title = t("timeline.fromTo", {
      from: item.fromStage?.name ?? "—",
      to: item.toStage.name,
    });
    return {
      id: `${item.kind}-${item.id}`,
      category: item.category,
      title,
      subtitle: when,
    };
  }

  const actorLine =
    item.actorName?.trim() ? t("timeline.by", { name: item.actorName.trim() }) : null;

  let title: string;
  switch (item.type) {
    case "STAGE_TRANSITION": {
      const from = payloadStr(item.payload, "fromStageName");
      const to = payloadStr(item.payload, "toStageName");
      if (from || to) {
        title = t("timeline.fromTo", { from: from ?? "—", to: to ?? "—" });
      } else {
        title = t("timeline.stageTransition");
      }
      break;
    }
    case "FILE_UPLOADED_TO_CLIENT":
      title = t("timeline.fileUpload");
      break;
    case "PATIENT_PORTAL_FILE_SUBMITTED":
      title = t("timeline.portalFileSubmitted");
      break;
    case "PATIENT_PORTAL_FILE_APPROVED":
      title = t("timeline.portalFileApproved");
      break;
    case "PATIENT_PORTAL_FILE_REJECTED":
      title = t("timeline.portalFileRejected");
      break;
    case "SELF_REGISTER_COMPLETED":
      title = t("timeline.selfRegister");
      break;
    case "PATIENT_CONSENT_GIVEN": {
      const ct = payloadStr(item.payload, "consentType");
      if (ct === "terms") title = t("timeline.consentTerms");
      else if (ct === "lgpd") title = t("timeline.consentPrivacy");
      else title = t("timeline.consentRecorded");
      break;
    }
    case "WHATSAPP_DISPATCH_QUEUED":
      title = t("timeline.whatsappDispatchQueued");
      break;
    case "WHATSAPP_DISPATCH_SENT":
      title = t("timeline.whatsappDispatchSent");
      break;
    case "WHATSAPP_DISPATCH_DELIVERED":
      title = t("timeline.whatsappDispatchDelivered");
      break;
    case "WHATSAPP_DISPATCH_READ":
      title = t("timeline.whatsappDispatchRead");
      break;
    case "WHATSAPP_DISPATCH_FAILED":
      title = t("timeline.whatsappDispatchFailed");
      break;
    case "WHATSAPP_PATIENT_CONFIRMED":
      title = t("timeline.whatsappPatientConfirmed");
      break;
    default:
      title = t("timeline.event");
  }

  return {
    id: `${item.kind}-${item.id}`,
    category: item.category,
    title,
    subtitle: subtitleWithActor(actorLine),
  };
}
