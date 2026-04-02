import { PatientPortalFileReviewStatus } from "@prisma/client";

/** Arquivos da clínica e envios do portal já aprovados. */
export function patientPortalFileIsDownloadableByPatient(status: PatientPortalFileReviewStatus): boolean {
  return (
    status === PatientPortalFileReviewStatus.NOT_APPLICABLE ||
    status === PatientPortalFileReviewStatus.APPROVED
  );
}

/** Lista no portal: oculta rejeitados. */
export function patientPortalFileVisibleInPatientList(status: PatientPortalFileReviewStatus): boolean {
  return status !== PatientPortalFileReviewStatus.REJECTED;
}
