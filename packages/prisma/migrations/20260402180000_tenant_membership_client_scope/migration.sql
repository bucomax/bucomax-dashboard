-- AlterTable
ALTER TABLE "TenantMembership" ADD COLUMN     "restrictedToAssignedOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linkedOpmeSupplierId" TEXT;

-- CreateIndex
CREATE INDEX "TenantMembership_tenantId_idx" ON "TenantMembership"("tenantId");

-- CreateIndex
CREATE INDEX "TenantMembership_linkedOpmeSupplierId_idx" ON "TenantMembership"("linkedOpmeSupplierId");

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_linkedOpmeSupplierId_fkey" FOREIGN KEY ("linkedOpmeSupplierId") REFERENCES "OpmeSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
