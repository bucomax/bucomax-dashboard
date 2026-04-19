import { appPrismaRepository } from "@/infrastructure/repositories/app.repository";

export async function runDeleteApp(appId: string) {
  return appPrismaRepository.delete(appId);
}
