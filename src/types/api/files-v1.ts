import type { ApiPagination } from "@/lib/api/pagination";

/** Linha de `GET /api/v1/clients/:clientId/files`. */
export type ClientFileListItemDto = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedBy: { id: string; name: string | null; email: string };
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
