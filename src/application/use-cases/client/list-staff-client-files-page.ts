import { fileAssetPrismaRepository } from "@/infrastructure/repositories/file-asset.repository";

export async function listStaffClientFilesPage(params: {
  tenantId: string;
  clientId: string;
  page: number;
  limit: number;
}) {
  return fileAssetPrismaRepository.listStaffClientFilesPage(params);
}
