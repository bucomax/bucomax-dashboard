import { appPrismaRepository } from "@/infrastructure/repositories/app.repository";

export async function listAllApps() {
  return appPrismaRepository.listAll();
}
