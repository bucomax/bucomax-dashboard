import type { ApiPagination } from "@/lib/api/pagination";

/** Espelho de `PatientPortalFileReviewStatus` (Prisma). */
export type PatientPortalFileReviewStatusDto =
  | "NOT_APPLICABLE"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

/** Linha de `GET /api/v1/clients/:clientId/files`. */
export type ClientFileListItemDto = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  patientPortalReviewStatus: PatientPortalFileReviewStatusDto;
  uploadedBy: { id: string; name: string | null; email: string } | null;
};

/** Corpo `data` de `GET /api/v1/clients/:clientId/files`. */
export type ClientFilesListResponseData = {
  data: ClientFileListItemDto[];
  pagination: ApiPagination;
};

export type ClientFilesListQueryParams = {
  page?: number;
  limit?: number;
};

export type FileDownloadPresignRequestBody = {
  fileId: string;
};

/** Corpo `data` de `POST /api/v1/files/presign-download`. */
export type FileDownloadPresignResponseData = {
  downloadUrl: string;
  expiresInSeconds: number;
};
