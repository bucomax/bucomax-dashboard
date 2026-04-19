import { appPrismaRepository } from "@/infrastructure/repositories/app.repository";

export async function runPublishApp(appId: string, isPublished: boolean) {
  return appPrismaRepository.setPublished(appId, isPublished);
}
