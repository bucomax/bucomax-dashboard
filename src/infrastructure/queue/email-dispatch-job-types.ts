/**
 * Carga útil BullMQ / inline para envio de e-mail transacional (Resend).
 */
export type EmailDispatchJobPayload =
  | {
      kind: "stage_transition_patient";
      tenantId: string;
      to: string;
      data: {
        patientName: string;
        stageName: string;
        patientMessage: string | null;
        documents: { fileName: string }[];
        portalUrl: string;
        clinicName: string;
      };
    }
  | {
      kind: "sla_alert";
      tenantId: string;
      data: {
        severity: "warning" | "danger";
        patientName: string;
        stageName: string;
        daysInStage: number;
        slaThresholdDays: number;
        clientId: string;
        targetUserIds: string[];
        clinicName: string;
      };
    }
  | {
      kind: "file_pending_review_staff";
      tenantId: string;
      data: {
        patientName: string;
        fileName: string;
        clientId: string;
        fileAssetId: string;
        targetUserIds: string[];
        clinicName: string;
      };
    }
  | {
      kind: "checklist_complete_staff";
      tenantId: string;
      data: {
        patientName: string;
        stageName: string;
        totalRequiredItems: number;
        clientId: string;
        targetUserIds: string[];
        clinicName: string;
      };
    };
