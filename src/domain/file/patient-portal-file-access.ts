export type PatientPortalFileReviewStatusValue = "NOT_APPLICABLE" | "PENDING" | "APPROVED" | "REJECTED" | string;

export function patientPortalFileIsDownloadableByPatient(status: PatientPortalFileReviewStatusValue): boolean {
  return status === "NOT_APPLICABLE" || status === "APPROVED";
}

export function patientPortalFileVisibleInPatientList(status: PatientPortalFileReviewStatusValue): boolean {
  return status !== "REJECTED";
}
