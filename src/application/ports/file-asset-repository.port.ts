export type CreateFileAssetInput = {
  tenantId: string;
  uploadedByUserId?: string | null;
  ownerType: string;
  ownerId: string;
  bucket: string;
  objectKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export interface IFileAssetRepository {
  create(input: CreateFileAssetInput): Promise<{ id: string }>;
  findById(tenantId: string, fileAssetId: string): Promise<unknown | null>;
  findByKey(tenantId: string, objectKey: string): Promise<unknown | null>;
  delete(tenantId: string, fileAssetId: string): Promise<void>;

  findForStaffDownloadPresign(
    tenantId: string,
    fileId: string,
  ): Promise<{ id: string; r2Key: string; clientId: string | null } | null>;

  findForDeleteByClient(
    tenantId: string,
    clientId: string,
    fileId: string,
  ): Promise<{ id: string; r2Key: string } | null>;

  deleteById(fileAssetId: string): Promise<void>;

  findForPatientPortalDownload(
    tenantId: string,
    clientId: string,
    fileId: string,
  ): Promise<{ id: string; r2Key: string; patientPortalReviewStatus: string } | null>;

  createStaffUploadedAsset(params: {
    tenantId: string;
    userId: string;
    r2Key: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    clientId: string | null;
    sha256Hash: string | null;
  }): Promise<{
    id: string;
    r2Key: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    sha256Hash: string | null;
    clientId: string | null;
    createdAt: Date;
  }>;

  findForStaffPortalReview(
    tenantId: string,
    clientId: string,
    fileId: string,
  ): Promise<{
    id: string;
    fileName: string;
    mimeType: string;
    patientPortalReviewStatus: string;
  } | null>;

  applyPatientPortalFileReview(params: {
    tenantId: string;
    clientId: string;
    fileAssetId: string;
    nextStatus: string;
    actorUserId: string;
    auditEventType: string;
    auditPayload: unknown;
  }): Promise<void>;

  listStaffClientFilesPage(params: {
    tenantId: string;
    clientId: string;
    page: number;
    limit: number;
  }): Promise<{
    totalItems: number;
    data: Array<{
      id: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      sha256Hash: string | null;
      createdAt: string;
      patientPortalReviewStatus: string;
      patientPortalRejectReason: string | null;
      uploadedBy: { id: string; name: string | null; email: string } | null;
    }>;
  }>;

  listPatientPortalFilesPage(params: {
    tenantId: string;
    clientId: string;
    page: number;
    limit: number;
  }): Promise<{
    totalItems: number;
    rows: Array<{
      id: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      sha256Hash: string | null;
      createdAt: Date;
      patientPortalReviewStatus: string;
    }>;
  }>;

  createPatientPortalPendingAsset(params: {
    tenantId: string;
    clientId: string;
    r2Key: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    sha256Hash: string | null;
  }): Promise<{
    id: string;
    r2Key: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    sha256Hash: string | null;
    clientId: string | null;
    patientPortalReviewStatus: string;
    createdAt: Date;
  }>;
}
