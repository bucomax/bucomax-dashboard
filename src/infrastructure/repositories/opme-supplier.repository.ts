import type {
  CreateOpmeSupplierResult,
  IOpmeSupplierRepository,
} from "@/application/ports/opme-supplier-repository.port";
import { prisma } from "@/infrastructure/database/prisma";

export class OpmeSupplierPrismaRepository implements IOpmeSupplierRepository {
  async findById(tenantId: string, supplierId: string) {
    return prisma.opmeSupplier.findFirst({
      where: { id: supplierId, tenantId },
    });
  }

  async findMany(tenantId: string) {
    return prisma.opmeSupplier.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
  }

  async findActive(tenantId: string) {
    return prisma.opmeSupplier.findMany({
      where: { tenantId, active: true },
      orderBy: { name: "asc" },
    });
  }

  async createIfUniqueName(tenantId: string, name: string): Promise<CreateOpmeSupplierResult> {
    const nameTrim = name.trim();
    const existing = await prisma.opmeSupplier.findFirst({
      where: {
        tenantId,
        name: { equals: nameTrim, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (existing) {
      return { ok: false, code: "NAME_CONFLICT" };
    }

    const supplier = await prisma.opmeSupplier.create({
      data: {
        tenantId,
        name: nameTrim,
      },
      select: { id: true, name: true, active: true },
    });

    return {
      ok: true,
      supplier: {
        ...supplier,
        activePatientsCount: 0,
      },
    };
  }
}

export const opmeSupplierPrismaRepository = new OpmeSupplierPrismaRepository();
