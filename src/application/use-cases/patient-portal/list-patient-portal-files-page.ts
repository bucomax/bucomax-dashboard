import { fileAssetPrismaRepository } from "@/infrastructure/repositories/file-asset.repository";

export async function listPatientPortalFilesPage(params: {
  tenantId: string;
  clientId: string;
  page: number;
  limit: number;
}) {
  return fileAssetPrismaRepository.listPatientPortalFilesPage(params);
}
