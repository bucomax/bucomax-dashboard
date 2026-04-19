import { appPrismaRepository } from "@/infrastructure/repositories/app.repository";
import type { z } from "zod";
import type { createAppBodySchema } from "@/lib/validators/app";
import type { Prisma } from "@prisma/client";

type CreateAppInput = z.infer<typeof createAppBodySchema>;

export async function runCreateApp(input: CreateAppInput) {
  return appPrismaRepository.create({
    ...input,
    configSchema: input.configSchema as unknown as Prisma.InputJsonValue,
    metadata: input.metadata as unknown as Prisma.InputJsonValue,
  });
}
