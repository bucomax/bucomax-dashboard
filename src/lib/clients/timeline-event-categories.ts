import { AuditEventType } from "@prisma/client";
import type { ClientTimelineEventCategory } from "@/types/api/clients-v1";

export const CLIENT_TIMELINE_EVENT_CATEGORIES: readonly ClientTimelineEventCategory[] = [
  "security",
  "clinical",
  "documents",
  "administrative",
  "compliance",
];

export function auditEventTypeToCategory(type: AuditEventType): ClientTimelineEventCategory {
  switch (type) {
    case AuditEventType.STAGE_TRANSITION:
    case AuditEventType.PATIENT_PATHWAY_STARTED:
    case AuditEventType.PATIENT_PATHWAY_COMPLETED:
    case AuditEventType.CHECKLIST_ITEM_TOGGLED:
    case AuditEventType.WHATSAPP_DISPATCH_QUEUED:
    case AuditEventType.WHATSAPP_DISPATCH_SENT:
    case AuditEventType.WHATSAPP_DISPATCH_DELIVERED:
    case AuditEventType.WHATSAPP_DISPATCH_READ:
    case AuditEventType.WHATSAPP_DISPATCH_FAILED:
    case AuditEventType.WHATSAPP_PATIENT_CONFIRMED:
      return "clinical";

    case AuditEventType.FILE_UPLOADED_TO_CLIENT:
    case AuditEventType.PATIENT_PORTAL_FILE_SUBMITTED:
    case AuditEventType.PATIENT_PORTAL_FILE_APPROVED:
    case AuditEventType.PATIENT_PORTAL_FILE_REJECTED:
    case AuditEventType.FILE_DOWNLOADED_BY_STAFF:
    case AuditEventType.FILE_DOWNLOADED_BY_PATIENT:
    case AuditEventType.FILE_DELETED:
      return "documents";

    case AuditEventType.PATIENT_CREATED:
    case AuditEventType.PATIENT_UPDATED:
    case AuditEventType.PATIENT_DELETED:
    case AuditEventType.SELF_REGISTER_COMPLETED:
      return "administrative";

    case AuditEventType.PATIENT_CONSENT_GIVEN:
      return "compliance";

    case AuditEventType.AUDIT_EXPORT_GENERATED:
      return "administrative";

    case AuditEventType.PATIENT_PORTAL_SESSION_CREATED:
    case AuditEventType.PATIENT_PORTAL_PASSWORD_SET:
    case AuditEventType.PATIENT_PORTAL_LINK_GENERATED:
    case AuditEventType.PATIENT_PORTAL_LOGIN_FAILED:
      return "security";

    case AuditEventType.STAFF_LOGIN_SUCCESS:
    case AuditEventType.STAFF_LOGIN_FAILED:
    case AuditEventType.STAFF_PASSWORD_CHANGED:
    case AuditEventType.STAFF_PASSWORD_RESET:
    default:
      return "administrative";
  }
}
