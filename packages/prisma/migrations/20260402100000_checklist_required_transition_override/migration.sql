-- AlterTable
ALTER TABLE "PathwayStageChecklistItem" ADD COLUMN "requiredForTransition" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StageTransition" ADD COLUMN "ruleOverrideReason" TEXT,
ADD COLUMN "forcedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "StageTransition_forcedByUserId_idx" ON "StageTransition"("forcedByUserId");

-- AddForeignKey
ALTER TABLE "StageTransition" ADD CONSTRAINT "StageTransition_forcedByUserId_fkey" FOREIGN KEY ("forcedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
