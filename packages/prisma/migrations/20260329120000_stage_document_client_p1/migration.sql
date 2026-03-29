-- CreateTable
CREATE TABLE "OpmeSupplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpmeSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageDocument" (
    "id" TEXT NOT NULL,
    "pathwayStageId" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StageDocument_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "email" TEXT,
ADD COLUMN "assignedToUserId" TEXT,
ADD COLUMN "opmeSupplierId" TEXT;

-- CreateIndex
CREATE INDEX "OpmeSupplier_tenantId_idx" ON "OpmeSupplier"("tenantId");

-- CreateIndex
CREATE INDEX "StageDocument_pathwayStageId_sortOrder_idx" ON "StageDocument"("pathwayStageId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "StageDocument_pathwayStageId_fileAssetId_key" ON "StageDocument"("pathwayStageId", "fileAssetId");

-- AddForeignKey
ALTER TABLE "OpmeSupplier" ADD CONSTRAINT "OpmeSupplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Client" ADD CONSTRAINT "Client_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Client" ADD CONSTRAINT "Client_opmeSupplierId_fkey" FOREIGN KEY ("opmeSupplierId") REFERENCES "OpmeSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StageDocument" ADD CONSTRAINT "StageDocument_pathwayStageId_fkey" FOREIGN KEY ("pathwayStageId") REFERENCES "PathwayStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StageDocument" ADD CONSTRAINT "StageDocument_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
