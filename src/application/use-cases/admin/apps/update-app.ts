import { appPrismaRepository } from "@/infrastructure/repositories/app.repository";
import type { z } from "zod";
import type { updateAppBodySchema } from "@/lib/validators/app";
import type { Prisma } from "@prisma/client";

type UpdateAppInput = z.infer<typeof updateAppBodySchema>;

export async function runUpdateApp(appId: string, input: UpdateAppInput) {
  const data: Prisma.AppUpdateInput = {
    ...input,
    configSchema: input.configSchema as unknown as Prisma.InputJsonValue,
    metadata: input.metadata as unknown as Prisma.InputJsonValue,
  };
  return appPrismaRepository.update(appId, data);
}
